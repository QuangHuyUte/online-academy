// app.js (ESM)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { engine } from 'express-handlebars';
import hbsSections from 'express-handlebars-sections';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import morgan from 'morgan';
import dayjs from 'dayjs';

// Helpers & middlewares
import hbsHelpers from './helpers/helpers.js';
import flash from './middlewares/flash.js';

// Models
import * as categoryModel from './models/category.model.js';
import userModel from './models/user.model.js';
import courseModel from './models/course.model.js';
import * as instructorModel from './models/instructor.model.js';

// Routes
import accountRouter from './routes/account.route.js';
import courseRouter from './routes/course.route.js';
import searchRouter from './routes/search.route.js';
import studentRoute from './routes/student.route.js';
import instructorRoute from './routes/instructor.route.js';
import adminRoutes from './routes/admin.route.js';
import previewRoute from './routes/preview.route.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------------------------------------------------------
// Core middlewares
// ----------------------------------------------------------------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));

// ----------------------------------------------------------------------------
// View engine: Handlebars (.handlebars)
// ----------------------------------------------------------------------------
app.engine(
  'handlebars',
  engine({
    extname: '.handlebars',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    partialsDir: [path.join(__dirname, 'views', 'partials')],
    helpers: {
      // sections for per-view CSS/JS blocks
      section: hbsSections(),

      // ✅ Alias tương thích với view cũ dùng {{#fill_Content "css"}}...{{/fill_Content}}
      fill_Content(name, options) {
        if (!this._sections) this._sections = {};
        this._sections[name] = options.fn(this);
        return null;
      },

      // base helpers bạn đã dùng khắp nơi
      ...hbsHelpers,

      // small extras
      subtract: (a, b) => Number(a) - Number(b),
      add: (a, b) => Number(a) + Number(b),
      formatDate: (date) => {
        if (!date) return '';
        const d = dayjs(date);
        return d.isValid() ? d.format('DD/MM/YYYY') : String(date);
      },
      range: (start, end) => Array.from({ length: end - start }, (_, i) => start + i),
      ifCond(v1, operator, v2, options) {
        switch (operator) {
          case '<': return v1 < v2 ? options.fn(this) : options.inverse(this);
          case '<=': return v1 <= v2 ? options.fn(this) : options.inverse(this);
          case '>': return v1 > v2 ? options.fn(this) : options.inverse(this);
          case '>=': return v1 >= v2 ? options.fn(this) : options.inverse(this);
          case '==': return v1 == v2 ? options.fn(this) : options.inverse(this); // eslint-disable-line eqeqeq
          case '===': return v1 === v2 ? options.fn(this) : options.inverse(this);
          default: return options.inverse(this);
        }
      },
    },
  })
);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// ----------------------------------------------------------------------------
// Session + Flash
// ----------------------------------------------------------------------------
app.set('trust proxy', 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// flash(): cung cấp res.flash(type, message)
app.use(flash);

// adapter để layout đọc {{flash.message}}
app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

// ----------------------------------------------------------------------------
// Passport Google OAuth (tuỳ chọn, bật nếu có ENV)
// ----------------------------------------------------------------------------
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/account/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(null, false);

          let user = await userModel.findByEmail(email);
          if (!user) {
            const placeholder = bcrypt.hashSync(profile.id + Date.now(), 10);
            const newUser = {
              name: profile.displayName || email.split('@')[0],
              email,
              password_hash: placeholder,
              role: 'student',
              created_at: new Date(),
            };
            await userModel.add(newUser);
            user = await userModel.findByEmail(email);
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const u = await userModel.findById(id);
      done(null, u);
    } catch (err) {
      done(err);
    }
  });
}

// ----------------------------------------------------------------------------
// Locals middlewares: categories menu 2 cấp + auth flags + hide nav
// ----------------------------------------------------------------------------
app.use(async (req, res, next) => {
  try {
    // Nếu model của bạn có các hàm này:
    // - findCategoriesParent(): danh mục cha
    // - findCategoryNotParent(): danh mục con
    // - findAllCourse(): toàn bộ courses (để gắn nhanh vào con)
    const parents = await categoryModel.findCategoriesParent?.();
    const subs = await categoryModel.findCategoryNotParent?.();
    const allCourses = await categoryModel.findAllCourse?.();

    const parentList = parents ?? [];
    const childList = subs ?? [];

    for (const p of parentList) {
      p.children = childList.filter((c) => c.parent_id === p.id);
    }
    if (Array.isArray(allCourses)) {
      for (const c of childList) {
        c.courses = allCourses.filter((co) => co.cat_id === c.id);
      }
    }
    res.locals.lcCategories = parentList;
  } catch {
    res.locals.lcCategories = [];
  }
  next();
});

app.use(async (req, res, next) => { // 💥 Thay đổi thành async để dùng await
  // Kiểm tra session auth
  const hasValidSession = req.session?.isAuthenticated && req.session.authUser;
  // Kiểm tra passport auth (chỉ khi không có session)
  const hasValidPassport = !hasValidSession && req.isAuthenticated?.() && req.user;

  let authUser = null;

  if (hasValidSession) {
    authUser = req.session.authUser;
  } else if (hasValidPassport) {
    authUser = req.user;
  }

  // 💥 LOGIC TẢI INSTRUCTOR PROFILE 💥
  if (authUser?.role === 'instructor' && authUser.id) {
    try {
      // Tải record từ bảng instructors
      const instRecord = await instructorModel.findByUserId(authUser.id); 
      if (instRecord) {
        // Gán avatar_url và bio vào authUser trong session và res.locals
        authUser.avatar_url = instRecord.avatar_url;
        authUser.bio = instRecord.bio;
        req.session.authUser = authUser; // Cập nhật session
      }
    } catch (err) {
      console.error('Lỗi khi tải instructor profile:', err);
    }
  }

  res.locals.isAuthenticated = !!authUser;
  res.locals.authUser = authUser;

  // Ẩn categories nav ở vài trang
  const p = req.path;
  res.locals.hideCategoriesNav =
    p === '/account/signup' || p === '/account/signin' || p.startsWith('/admin') || p.startsWith('/instructor');
  next();
});

// ----------------------------------------------------------------------------
// Home
// ----------------------------------------------------------------------------
app.get('/', async (req, res, next) => {
  try {
    const role = (res.locals.authUser?.role || '').toLowerCase();
    if (role === 'instructor') return res.redirect('/instructor');
    //if (role === 'admin')      return res.redirect('/admin');

    // --- giữ nguyên render trang Home cho student/guest ---
    const courses_bestseller = await (courseModel.finBestSellerthanAvg?.() ?? []);
    const courses_newest     = await (courseModel.findCourses?.({ limit: 10, offset: 0, sortBy: 'newest' }) ?? []);
    const Top10ViewedCourses = await (courseModel.findTop10ViewedCourses?.() ?? []);
    const topfield           = await (courseModel.findTopFieldCourses?.() ?? []);

    res.render('vwHome/index', {
      title: 'Home',
      courses_bestseller,
      courses_newest,
      Top10ViewedCourses,
      topfield,
    });
  } catch (err) {
    next(err);
  }
});


// ----------------------------------------------------------------------------
// Mount routes
// ----------------------------------------------------------------------------
app.use('/account', accountRouter);
app.use('/courses', courseRouter);
app.use('/search', searchRouter);
app.use('/student', studentRoute);
app.use('/instructor', instructorRoute);
app.use('/admin', adminRoutes);

// Public preview (không khoá instructor)
app.use(previewRoute);

// ----------------------------------------------------------------------------
// 404
// ----------------------------------------------------------------------------
// app.use((req, res) => {
//   res.status(404).render('vwHome/not-found', { title: 'Not found' });
// });

// ----------------------------------------------------------------------------
// Start
// ----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

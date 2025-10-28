// app.js — Unified ESM app using express-handlebars (.hbs)
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
import * as courseModelNamed from './models/course.model.js';
import userModelDefault, * as userModelNamed from './models/user.model.js';

// Routes
import accountRouter from './routes/account.route.js';
import courseRouter from './routes/course.route.js';
import searchRouter from './routes/search.route.js';
import studentRoute from './routes/student.route.js';
import instructorRoutes from './routes/instructor.route.js';
import adminRoutes from './routes/admin.route.js';
import previewRoute from './routes/preview.route.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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
// View engine: express-handlebars (.hbs)
// ----------------------------------------------------------------------------
app.engine(
  'hbs',
  engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    partialsDir: [path.join(__dirname, 'views', 'partials')],
    helpers: {
      section: hbsSections(),
      // base helpers (eq, inc, add, buildPagination, formatCurrency, formatDate, stripHtml, isYouTube, toYouTubeEmbed, ...)
      ...hbsHelpers,
      // extra small helpers often used around the codebase
      subtract: (a, b) => Number(a) - Number(b),
      add: (a, b) => Number(a) + Number(b),
      formatDate: (date) => {
        if (!date) return '';
        const d = dayjs(date);
        return d.isValid() ? d.format('DD/MM/YYYY') : String(date);
      },
      range: (start, end) => Array.from({ length: end - start }, (_, i) => start + i),
      ifCond: function (v1, operator, v2, options) {
        switch (operator) {
          case '<': return v1 < v2 ? options.fn(this) : options.inverse(this);
          case '<=': return v1 <= v2 ? options.fn(this) : options.inverse(this);
          case '>': return v1 > v2 ? options.fn(this) : options.inverse(this);
          case '>=': return v1 >= v2 ? options.fn(this) : options.inverse(this);
          case '==': return /* eslint eqeqeq: off */ v1 == v2 ? options.fn(this) : options.inverse(this);
          case '===': return v1 === v2 ? options.fn(this) : options.inverse(this);
          default: return options.inverse(this);
        }
      },
    },
  })
);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// ----------------------------------------------------------------------------
/** Session + Flash
 *  - Flash middleware của bạn đã cung cấp res.flash(...) và set vào session.
 *  - Đoạn adapter dưới giúp layout đọc {{flash.message}} nếu bạn dùng banner flash ở layout.
 */
app.set('trust proxy', 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);
app.use(flash);
app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

// ----------------------------------------------------------------------------
// Passport Google OAuth (tuỳ chọn, bật nếu có ENV)
// ----------------------------------------------------------------------------
const userModel = userModelDefault && userModelDefault.findByEmail ? userModelDefault : userModelNamed;

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

          let user = await (userModel.findByEmail?.(email));
          if (!user) {
            const placeholder = bcrypt.hashSync(profile.id + Date.now(), 10);
            const newUser = {
              name: profile.displayName || email.split('@')[0],
              email,
              password_hash: placeholder,
              role: 'student',
              created_at: new Date(),
            };
            await (userModel.add?.(newUser));
            user = await (userModel.findByEmail?.(email));
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
      const u = await (userModel.findById?.(id));
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
    // Tạo lcCategories: cấp 1 + con
    const parents = await categoryModel.findByParent?.(null);
    const children = await categoryModel.findAll?.(); // đã bao gồm cả cha & con
    // Nếu bạn có sẵn findByParent(null) và findByParent(id), dùng logic dưới cho chắc:
    const top = await categoryModel.findByParent?.(null);
    const subs = await categoryModel.findAll?.();

    const parentList = top ?? parents ?? [];
    const allCats = subs ?? children ?? [];

    const parentMap = new Map(parentList.map((p) => [p.id, { ...p, children: [] }]));
    for (const c of allCats) {
      if (c.parent_id && parentMap.has(c.parent_id)) {
        parentMap.get(c.parent_id).children.push(c);
      }
    }
    res.locals.lcCategories = Array.from(parentMap.values());
  } catch {
    res.locals.lcCategories = [];
  }
  next();
});

app.use((req, res, next) => {
  // Gắn flags auth cho layout (tùy ứng dụng của bạn quản lý session như thế nào)
  if (req.session?.auth && req.session.user) {
    res.locals.isAuthenticated = true;
    res.locals.authUser = req.session.user;
  } else if (req.isAuthenticated?.() && req.user) {
    // trường hợp dùng passport
    res.locals.isAuthenticated = true;
    res.locals.authUser = req.user;
  } else {
    res.locals.isAuthenticated = false;
    res.locals.authUser = null;
  }

  // Ẩn categories nav ở vài trang
  const p = req.path;
  res.locals.hideCategoriesNav = p === '/account/signup' || p === '/account/signin' || p.startsWith('/admin');
  next();
});

// ----------------------------------------------------------------------------
// Home (nếu đã có route riêng cho home thì bỏ đoạn này)
// ----------------------------------------------------------------------------
app.get('/', async (req, res, next) => {
  try {
    // các hàm dưới thuộc default export của course.model (nhánh main),
    // trong file model đã gộp nên vẫn có:
    const courses_bestseller = await courseModelNamed.default?.finBestSellerthanAvg?.() ?? [];
    const courses_newest = await courseModelNamed.default?.findCourses?.({ limit: 10, offset: 0, sortBy: 'newest' }) ?? [];
    const Top10ViewedCourses = await courseModelNamed.default?.findTop10ViewedCourses?.() ?? [];
    const topfield = await courseModelNamed.default?.findTopFieldCourses?.() ?? [];

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
app.use('/instructor', instructorRoutes);
app.use('/admin', adminRoutes);

// Public preview (không khoá instructor)
app.use(previewRoute);

// ----------------------------------------------------------------------------
// 404
// ----------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).render('vwHome/not-found', { title: 'Not found' });
});

// ----------------------------------------------------------------------------
// Start
// ----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

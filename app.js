import express from 'express';
import { engine } from 'express-handlebars';
import hbs_sections from 'express-handlebars-sections';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcryptjs';
import userModel from './models/user.model.js';
import dotenv from 'dotenv';
import morgan from 'morgan';
import dayjs from 'dayjs';
import { restrictAdmin, checkAuthenticated } from './middlewares/auth.mdw.js';
// ROUTES & MODELS
import accountRouter from './routes/account.route.js';
import categoryModel from './models/category.model.js';
import courseRouter from './routes/course.route.js';
import courseModel from './models/course.model.js';
import searchRouter from './routes/search.route.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// __dirname setup
import path from 'path';
const __dirname = import.meta.dirname;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(morgan('dev'));

// Session setup
app.set('trust proxy', 1);
app.use(session({
  secret: 'sgghgfgghjgjffhgjgfh',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Initialize passport after session middleware
app.use(passport.initialize());
app.use(passport.session());

// Passport Google strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/account/auth/google/callback'
}, async function(accessToken, refreshToken, profile, done) {
  try {
    const email = profile.emails && profile.emails[0] && profile.emails[0].value;
    if (!email) return done(null, false);

    let user = await userModel.findByEmail(email);
    if (!user) {
      // create a new user with a random password hash placeholder
      const placeholder = bcrypt.hashSync(profile.id + Date.now(), 10);
      const newUser = {
        name: profile.displayName || email.split('@')[0],
        email: email,
        password_hash: placeholder,
        role: 'student',
        created_at: new Date()
      };
      await userModel.add(newUser);
      user = await userModel.findByEmail(email);
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(async function(id, done) {
  try {
    const user = await userModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Handlebars setup
app.engine('handlebars', engine({
  helpers: {
    fill_Content: hbs_sections(),
    eq: (a, b) => a === b, // dòng này của vũ
    subtract: (a, b) => a - b,//vũ
    add: (a, b) => a + b,//vũ
    formatDate: (date, format) => dayjs(date).format(format || 'DD/MM/YYYY'),//vũ
  },

  partialsDir: path.join(__dirname, 'views', 'partials')// vũ too
}));
app.use(express.json());
app.set('view engine', 'handlebars');
app.set('views', './views');
app.use(express.urlencoded({ extended: true }));


//CATEGORIES 2 CẤP
app.use(async function (req, res, next) {
  const local_categories = await categoryModel.findCategoriesParent();
  const local_categories_not_parent = await categoryModel.findCategoryNotParent();
  const all_courses = await categoryModel.findAllCourse();

  for (const cat of local_categories) {
    cat.children = local_categories_not_parent.filter(
      subCat => subCat.parent_id === cat.id
    );
  }
  for (const subCat of local_categories_not_parent) {
    subCat.courses = all_courses.filter(
      course => course.cat_id === subCat.id
    );
  }

  res.locals.lcCategories = local_categories;
  next();
});
//  AUTH LOCAL VARIABLES 
app.use(async function (req, res, next) {
  if (req.session.isAuthenticated) {
    res.locals.isAuthenticated = true;
    res.locals.authUser = req.session.authUser;
  } const path = req.path;
  res.locals.hideCategoriesNav = (path === '/account/signup' || path === '/account/signin');
  next();
});

// HOME
app.get('/', async (req, res) => {
  const courses_bestseller = await courseModel.finBestSellerthanAvg();
  const courses_newest = await courseModel.findNewest7day();
  // Hàm chunk
  function chunkArray(arr, chunkSize = 4) {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    const result = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      result.push(arr.slice(i, i + chunkSize));
    }
    return result;
  }

  // Tạo slides
  const slides_bestseller = chunkArray(courses_bestseller, 4);
  const slides_newest = chunkArray(courses_newest, 4);
  
  console.log(slides_newest.length);
  console.log(slides_bestseller.length);
  // Render
  res.render('vwHome/index', {
    slides_bestseller,
    slides_newest,
  });
});



// ROUTES
app.use('/account', accountRouter);
app.use('/courses', courseRouter);
app.use('/search', searchRouter); //vũ too
app.use(function (req, res) {
  res.status(404).render('404');
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

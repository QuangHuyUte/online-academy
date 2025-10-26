import express from 'express';
import { engine } from 'express-handlebars';
import hbs_sections from 'express-handlebars-sections';
import session from 'express-session';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { restrictAdmin, checkAuthenticated } from './middlewares/auth.mdw.js';
import accountRouter from './routes/account.route.js';
import categoryModel from './models/category.model.js';
import courseRouter from './routes/course.route.js';
import courseModel from './models/course.model.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(morgan('dev'));

app.set('trust proxy', 1);
app.use(session({
  secret: 'sgghgfgghjgjffhgjgfh',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.engine('handlebars', engine({
  helpers: { fill_Content: hbs_sections() },
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

//  HOME
app.get('/', async (req, res) => {
  try {

    const [featuredCourses, mostViewedCourses, newestCourses, newestTotal, topCategories] = await Promise.all([
      courseModel.getFeaturedCourses(),
      courseModel.getMostViewedCourses(),
      courseModel.getNewestCourses(4, 0),
      courseModel.countNewestCourses(),
      courseModel.getTopCategories(),
    ]);

    const newestTotalRemaining = Math.max(0, newestTotal - 4);
    const newestAdditionalPages = newestTotalRemaining > 0 ? Math.ceil(newestTotalRemaining / 6) : 0;
    const newestTotalPages = 1 + newestAdditionalPages;
    const newestPageNumbers = [];
    for (let i = 1; i <= newestTotalPages; i++) {
      newestPageNumbers.push({ value: i, isActive: i === 1, url: i === 1 ? '/' : `/courses/newest?page=${i}` });
    }

    res.render('vwHome/index', {
      featuredCourses,
      mostViewedCourses,
      newestCourses,
      topCategories,
      newestPageNumbers,
      newestCurrentPage: 1,
      newestTotalPages,
      newestNextPage: newestTotalPages > 1 ? 2 : null
    });
  } catch (err) {
    console.error(err);
    res.render('vwHome/index', {
      featuredCourses: [],
      mostViewedCourses: [],
      newestCourses: [],
      topCategories: [],
    });
  }
});

// ROUTES
app.use('/account', accountRouter);
app.use('/courses', courseRouter);
app.use(function (req, res) {
  res.status(404).render('404');
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

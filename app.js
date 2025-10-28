import express from 'express';
import { engine } from 'express-handlebars';
import hbs_sections from 'express-handlebars-sections';
import session from 'express-session';
import dotenv from 'dotenv';
import morgan from 'morgan';
import dayjs from 'dayjs';
import { restrictAdmin, checkAuthenticated } from './middlewares/auth.mdw.js';
import accountRouter from './routes/account.route.js';
import categoryModel from './models/category.model.js';

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
}))
>>>>>>>>> Temporary merge branch 2

app.engine('handlebars', engine({
  helpers: { 
    fill_Content: hbs_sections(),
  }
}));
app.use(express.json());
app.set('view engine', 'handlebars');
app.set('views', './views');
app.use(express.urlencoded(
    {extended:true}
));

// app.use(session({
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: true,
//   cookie: { secure: false }
// }));

// app.js

// ... (phần import và khởi tạo khác)

app.use(async function(req, res, next) {
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

// ... (phần route và listen khác)


app.use(async function(req, res, next) {
  if(req.session.isAuthenticated) {
    res.locals.isAuthenticated = true;
    res.locals.authUser = req.session.authUser;
  }
  //copy toan bo du lieu trong session vao bien cuc bo
  const path = req.path;
  res.locals.hideCategoriesNav = (path === '/account/signup' || path === '/account/signin');
  next();
});


app.use('/account', accountRouter);
app.get('/', (req, res) => {
   if(req.session.isAuthenticated){
    console.log(req.session.authUser);
    console.log('User is logged in');
  }
  res.render('vwHome/index');
});

app.use(function(req, res) {
    res.status(404).render('404');
});

// ✅ START SERVER
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

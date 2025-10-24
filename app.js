import express from 'express';
import { engine } from 'express-handlebars';
import hbs_sections from 'express-handlebars-sections';
import session from 'express-session';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { restrictAdmin, checkAuthenticated } from './middlewares/auth.mdw.js';
import accountRouter from './routes/account.route.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(morgan('dev'));

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'sgghgfgghjgjffhgjgfh',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}))

app.engine('handlebars', engine({
  helpers: { fill_Content: hbs_sections() }
}));
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

app.use(async function(req, res, next) {
  if(req.session.isAuthenticated) {
    res.locals.isAuthenticated = true;
    res.locals.authUser = req.session.authUser;
  }
  //copy toan bo du lieu trong session vao bien cuc bo
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

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

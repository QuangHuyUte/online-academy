import express from 'express';
import { engine } from 'express-handlebars';
import hbs_sections from 'express-handlebars-sections';
import session from 'express-session';
import dotenv from 'dotenv';
import morgan from 'morgan';
import path from 'path';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = import.meta.dirname;


// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(morgan('dev'));

app.engine('handlebars', engine({
  helpers: { 
    section: hbs_sections(),
    eq: (a, b) => a === b,
    partialsDir: path.join(__dirname, 'views', 'partials')
   }  
  
}
));
app.set('view engine', 'handlebars');
app.set('views', './views');

// app.use(session({
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: true,
//   cookie: { secure: false }
// }));

import searchRouter from './routes/search.route.js';
app.use('/search', searchRouter);

app.get('/', (req, res) => {
  res.render('vwHome/index');
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

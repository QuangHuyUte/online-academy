import express from 'express';
import { engine } from 'express-handlebars';
import hbs_sections from 'express-handlebars-sections';
import session from 'express-session';
import dotenv from 'dotenv';
import morgan from 'morgan';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(morgan('dev'));

app.engine('handlebars', engine({
  helpers: { fillContent: hbs_sections() }
}));
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.get('/', (req, res) => {
  res.render('vwHome/index');
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

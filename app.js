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
app.use(express.json());
app.use(express.static('public'));
app.use(morgan('dev'));

app.engine('handlebars', engine({
  helpers: {
    fillContent: hbs_sections(),

    // ✅ Helper range trả về mảng
    range: function(start, end) {
      let array = [];
      for (let i = start; i < end; i++) {
        array.push(i);
      }
      return array;
    },

    // ✅ Helper ifCond dùng để so sánh
    ifCond: function(v1, operator, v2, options) {
      switch (operator) {
        case '<': return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=': return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>': return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=': return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '==': return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===': return (v1 === v2) ? options.fn(this) : options.inverse(this);
        default: return options.inverse(this);
      }
    },

    // ✅ Định dạng ngày
    formatDate: function(date) {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('vi-VN');
    }
  }
}));
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(session({
  secret: process.env.SESSION_SECRET || 'mysecretkey',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Import routes
import courseRouter from './routes/course.route.js';
import accountRouter from './routes/account.route.js';

// Sử dụng routes
app.use('/courses', courseRouter);
app.use('/account', accountRouter);


app.get('/', (req, res) => {
  res.render('vwHome/index');
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

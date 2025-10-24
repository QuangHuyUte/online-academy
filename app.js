// app.js (đã rút gọn & đúng thứ tự)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { engine } from 'express-handlebars';
import hbsSections from 'express-handlebars-sections';
import session from 'express-session';
import dotenv from 'dotenv';
import morgan from 'morgan';

import hbsHelpers from './helpers/helpers.js';    
import flash from './middleware/flash.js';
import instructorRoutes from './routes/instructor.route.js';
import adminRoutes from './routes/admin.route.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// __dirname cho ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware cơ bản
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(morgan('dev'));

// Handlebars – chỉ cấu hình 1 lần
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
  helpers: {
    fillContent: hbsSections(), // {{#section}}...{{/section}}
    ...hbsHelpers,              // helpers custom
  }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Session + flash
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use(flash);

// Routes
app.get('/', (req, res) => res.render('vwHome/index'));
app.use('/instructor', instructorRoutes);
app.use('/admin', adminRoutes);

// 404
app.use((req, res) => res.status(404).render('vwHome/not-found', { title: 'Not found' }));

app.listen(PORT, () => console.log(`✅ http://localhost:${PORT}`));

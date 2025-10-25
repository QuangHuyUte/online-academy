// app.js (ESM, cấu hình Handlebars .hbs đầy đủ & rõ ràng)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { engine } from 'express-handlebars';
import hbsSections from 'express-handlebars-sections';
import session from 'express-session';
import dotenv from 'dotenv';
import morgan from 'morgan';

import hbsHelpers from './helpers/helpers.js';
import flash from './middlewares/flash.js';
import instructorRoutes from './routes/instructor.route.js';
import adminRoutes from './routes/admin.route.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// __dirname cho ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Middleware cơ bản =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // dùng path.join cho chắc
app.use(morgan('dev'));

// ===== Handlebars – cấu hình 1 lần, dùng đuôi .hbs =====
app.engine('hbs', engine({
  extname: '.hbs',                                // <— toàn bộ file view/partial/layout dùng .hbs
  defaultLayout: 'main',                          // file: views/layouts/main.hbs
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: [
    path.join(__dirname, 'views', 'partials'),    // file: views/partials/*.hbs
    // Nếu bạn có nhiều nhóm partial: thêm thư mục vào đây
    // path.join(__dirname, 'views', 'partials', 'instructor'),
    // path.join(__dirname, 'views', 'partials', 'admin'),
  ],
  helpers: {
    section: hbsSections(),                       // dùng {{#section 'name'}} trong layout
    ...hbsHelpers,                                // helpers custom của bạn
  }
}));
app.set('view engine', 'hbs');                    // <— quan trọng: view engine là 'hbs'
app.set('views', path.join(__dirname, 'views'));  // thư mục chứa views

// ===== Session + flash =====
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
}));
app.use(flash);

// ===== Routes =====
app.get('/', (req, res) => res.render('vwHome/index', { title: 'Home' }));
app.use('/instructor', instructorRoutes);
app.use('/admin', adminRoutes);

// ===== 404 =====
app.use((req, res) => {
  res.status(404).render('vwHome/not-found', { title: 'Not found' });
});

app.listen(PORT, () => console.log(`✅ http://localhost:${PORT}`));

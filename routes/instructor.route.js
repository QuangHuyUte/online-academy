import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

import * as courseModel from '../models/course.model.js';
import * as categoryModel from '../models/category.model.js';
import * as instructorModel from '../models/instructor.model.js';
import { authRequired, requireInstructor } from '../middlewares/auth.mdw.js';

const router = express.Router();

/* ----------------------------- Helper: slugify ----------------------------- */
function slugify(str = '') {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

/* ------------------------------- Multer setup ------------------------------ */
const uploadDir = 'public/uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${slugify(base)}-${Date.now()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  // cho ảnh & video cơ bản; tuỳ bạn siết lại MIME
  const allow = /image\/|video\//.test(file.mimetype);
  if (!allow) return cb(new Error('Only image/video files are allowed'));
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 200 }, // 200MB, điều chỉnh tuỳ ý
});

/* ============================ INSTRUCTOR FEATURE ============================ */

// 📘 My Courses list
router.get('/my-courses', authRequired, requireInstructor, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const instructor = await instructorModel.findByUserId(userId);
    if (!instructor) return res.status(404).send('Instructor not found');

    const page = Number(req.query.page) || 1;
    const limit = 6;
    const offset = (page - 1) * limit;

    // Gợi ý: ẩn course đã remove
    const [rows, countObj] = await Promise.all([
      courseModel.findPageByInstructor(instructor.id, offset, limit, { excludeRemoved: true }),
      courseModel.countByInstructor(instructor.id, { excludeRemoved: true }),
    ]);
    const total = Number(countObj?.amount || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.render('vwCourse/my-courses', {
      title: 'My Courses',
      courses: rows,
      page,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// 📘 New Course form
router.get('/courses/new', authRequired, requireInstructor, async (_req, res, next) => {
  try {
    const categories = await categoryModel.findAll();
    res.render('vwCourse/course-form', { title: 'New Course', categories, course: {} });
  } catch (err) {
    next(err);
  }
});

// 📘 Create Course
router.post('/courses', authRequired, requireInstructor, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const instructor = await instructorModel.findByUserId(userId);
    if (!instructor) return res.status(400).send('Instructor profile not found');

    const data = {
      instructor_id: instructor.id,
      cat_id: Number(req.body.cat_id),
      title: req.body.title?.trim(),
      short_desc: req.body.short_desc?.trim() || null,
      long_desc_html: req.body.long_desc_html || '',
      cover_url: req.body.cover_url || null,   // lấy từ ô input hidden sau khi upload
      price: Number(req.body.price || 0),
      promo_price: req.body.promo_price ? Number(req.body.promo_price) : null,
      is_removed: false,
      is_completed: false,
      last_updated_at: new Date(),
    };

    // Optional: validate cat_id tồn tại
    // const cat = await categoryModel.findById(data.cat_id);
    // if (!cat) return res.status(400).send('Invalid category');

    await courseModel.add(data);

    req.session.flash = { type: 'success', message: 'Course created successfully.' };
    res.redirect('/instructor/my-courses');
  } catch (err) {
    next(err);
  }
});

// 📘 Edit Course form
router.get('/courses/:id/edit', authRequired, requireInstructor, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const instructor = await instructorModel.findByUserId(userId);
    if (!instructor) return res.status(400).send('Instructor profile not found');

    const course = await courseModel.findById(req.params.id);
    if (!course) return res.sendStatus(404);

    // Check ownership
    if (course.instructor_id !== instructor.id) return res.sendStatus(403);

    const categories = await categoryModel.findAll();
    res.render('vwCourse/course-form', { title: 'Edit Course', course, categories });
  } catch (err) {
    next(err);
  }
});

// 📘 Update Course
router.post('/courses/:id', authRequired, requireInstructor, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const userId = req.session.user.id;
    const instructor = await instructorModel.findByUserId(userId);
    if (!instructor) return res.status(400).send('Instructor profile not found');

    const course = await courseModel.findById(id);
    if (!course) return res.sendStatus(404);
    if (course.instructor_id !== instructor.id) return res.sendStatus(403);

    const patch = {
      title: req.body.title?.trim(),
      short_desc: req.body.short_desc?.trim() || null,
      long_desc_html: req.body.long_desc_html || '',
      cat_id: Number(req.body.cat_id),
      cover_url: req.body.cover_url || course.cover_url || null,
      price: Number(req.body.price || 0),
      promo_price: req.body.promo_price ? Number(req.body.promo_price) : null,
      last_updated_at: new Date(),
    };

    await courseModel.patch(id, patch);
    req.session.flash = { type: 'success', message: 'Course updated successfully.' };
    res.redirect('/instructor/my-courses');
  } catch (err) {
    next(err);
  }
});

// 📘 Mark Course Completed
router.post('/courses/:id/complete', authRequired, requireInstructor, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const userId = req.session.user.id;
    const instructor = await instructorModel.findByUserId(userId);
    if (!instructor) return res.status(400).send('Instructor profile not found');

    const course = await courseModel.findById(id);
    if (!course) return res.sendStatus(404);
    if (course.instructor_id !== instructor.id) return res.sendStatus(403);

    await courseModel.patch(id, { is_completed: true, last_updated_at: new Date() });
    req.session.flash = { type: 'success', message: 'Marked as completed.' };
    res.redirect('/instructor/my-courses');
  } catch (err) {
    next(err);
  }
});

// 📘 Upload (Uppy/Multer)
router.post('/upload', authRequired, requireInstructor, upload.single('file'), (req, res) => {
  // Static đang serve từ /public → trả về path bắt đầu từ /
  const relPath = req.file?.path?.replace(/^public/, '') || '';
  res.json({ url: relPath }); // ví dụ: /uploads/abc-123.jpg
});

export default router;

// routes/instructor.route.js
import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import sanitizeHtml from 'sanitize-html';

import * as courseModel from '../models/course.model.js';
import * as categoryModel from '../models/category.model.js';
import * as instructorModel from '../models/instructor.model.js';
import { authRequired, requireInstructor } from '../middlewares/auth.mdw.js';

const router = express.Router();

/* ----------------------------- Helper utils ----------------------------- */
function slugify(str = '') {
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
    .toLowerCase();
}

// ✅ toNum chuẩn hoá NaN -> null
const toNum = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const sanitizeLongHtml = (html = '') =>
  sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'span', 'iframe']),
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder'],
      '*': ['style'],
    },
  });

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

// Siết MIME
const fileFilter = (_req, file, cb) => {
  const isImage = /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype);
  const isVideo = /^video\/(mp4|webm|ogg)$/i.test(file.mimetype);
  if (!isImage && !isVideo) return cb(new Error('Only png/jpg/webp/gif/mp4/webm/ogg allowed'));
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 200 }, // 200MB
});

/* --------------------------- Auth protect all routes ---------------------------- */
// ✅ BẬT LẠI bảo vệ
router.use(authRequired, requireInstructor);

router.post('/upload', upload.single('file'), (req, res) => {
  // ✅ Normalize path (backslash -> slash) + thêm leading slash
  let relPath = req.file?.path?.replace(/^public[\\/]/, '') || '';
  relPath = relPath.split(path.sep).join('/');
  if (!relPath.startsWith('/')) relPath = '/' + relPath;
  return res.json({ url: relPath });
});

// Multer error handler: trả JSON để client hiện thông báo
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError || /Only .* allowed/i.test(err.message)) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});


/* ============================ INSTRUCTOR FEATURE ============================ */

// 📘 My Courses list
router.get('/my-courses', async (req, res, next) => {
  try {
    const me = await instructorModel.findByUserId(req.session.user.id);
    if (!me) return res.status(404).send('Instructor not found');

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 6;
    const offset = (page - 1) * limit;

    const [rows, { amount }] = await Promise.all([
      courseModel.findPageByInstructor(me.id, offset, limit, { excludeRemoved: true }),
      courseModel.countByInstructor(me.id, { excludeRemoved: true }),
    ]);

    res.render('vwInstructor/my-courses', {
      title: 'My Courses',
      courses: rows,
      page,
      totalPages: Math.max(1, Math.ceil(Number(amount || 0) / limit)),
    });
  } catch (err) {
    next(err);
  }
});

// 📘 New Course form
router.get('/courses/new', async (req, res, next) => {
  try {
    const categories = await categoryModel.findAll();
    res.render('vwInstructor/edit-course', {
      title: 'New Course',
      categories,
      course: {},
    });
  } catch (err) {
    next(err);
  }
});

// 📘 Create Course
router.post('/courses', async (req, res, next) => {
  try {
    const me = await instructorModel.findByUserId(req.session.user.id);
    if (!me) return res.status(400).send('Instructor profile not found');

    const payload = {
      instructor_id: me.id,
      cat_id: Number(req.body.cat_id),
      title: req.body.title?.trim(),
      short_desc: req.body.short_desc?.trim() || null,
      long_desc_html: sanitizeLongHtml(req.body.long_desc_html || ''),
      cover_url: req.body.cover_url || null,
      price: toNum(req.body.price),
      promo_price: toNum(req.body.promo_price),
      is_removed: false,
      is_completed: false,
    };

    // ✅ Validate số hợp lệ (NaN -> null nhưng user nhập string rác)
    if (payload.price == null && req.body.price?.trim()) {
      res.flash('error', 'Giá không hợp lệ.');
      return res.redirect('back');
    }
    if (payload.promo_price == null && req.body.promo_price?.trim()) {
      res.flash('error', 'Giá khuyến mãi không hợp lệ.');
      return res.redirect('back');
    }

    // Validate logic
    if (!payload.title) {
      res.flash('error', 'Title không được để trống.');
      return res.redirect('back');
    }
    if (payload.price != null && payload.price < 0) {
      res.flash('error', 'Giá không hợp lệ.');
      return res.redirect('back');
    }
    if (payload.promo_price != null && payload.price != null && payload.promo_price > payload.price) {
      res.flash('error', 'Giá khuyến mãi không được lớn hơn giá gốc.');
      return res.redirect('back');
    }

    // ✅ Category tồn tại & là leaf (không phải cha)
    const cat = await categoryModel.findById(payload.cat_id);
    if (!cat) {
      res.flash('error', 'Category không tồn tại.');
      return res.redirect('back');
    }
    const childrenCount = await categoryModel.countChildren?.(payload.cat_id);
    if (typeof childrenCount === 'number' && childrenCount > 0) {
      res.flash('error', 'Vui lòng chọn Category cấp 2 (không phải nhóm cha).');
      return res.redirect('back');
    }

    await courseModel.add(payload);
    res.flash('success', 'Course created successfully.');
    res.redirect('/instructor/my-courses');
  } catch (err) {
    next(err);
  }
});

// 📘 Edit Course form
router.get('/courses/:id/edit', async (req, res, next) => {
  try {
    const me = await instructorModel.findByUserId(req.session.user.id);
    if (!me) return res.status(400).send('Instructor profile not found');

    const course = await courseModel.findById(req.params.id);
    if (!course) return res.sendStatus(404);
    if (course.instructor_id !== me.id) return res.sendStatus(403);

    const categories = await categoryModel.findAll();
    res.render('vwInstructor/edit-course', {
      title: 'Edit Course',
      course,
      categories,
    });
  } catch (err) {
    next(err);
  }
});

// 📘 Update Course
router.post('/courses/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const me = await instructorModel.findByUserId(req.session.user.id);
    if (!me) return res.status(400).send('Instructor profile not found');

    const course = await courseModel.findById(id);
    if (!course) return res.sendStatus(404);
    if (course.instructor_id !== me.id) return res.sendStatus(403);

    const patch = {
      title: req.body.title?.trim(),
      short_desc: req.body.short_desc?.trim() || null,
      long_desc_html: sanitizeLongHtml(req.body.long_desc_html || ''),
      cat_id: Number(req.body.cat_id),
      cover_url: req.body.cover_url || course.cover_url || null,
      price: toNum(req.body.price),
      promo_price: toNum(req.body.promo_price),
    };

    // ✅ Validate số hợp lệ (NaN -> null nhưng user nhập string rác)
    if (patch.price == null && req.body.price?.trim()) {
      res.flash('error', 'Giá không hợp lệ.');
      return res.redirect('back');
    }
    if (patch.promo_price == null && req.body.promo_price?.trim()) {
      res.flash('error', 'Giá khuyến mãi không hợp lệ.');
      return res.redirect('back');
    }

    if (!patch.title) {
      res.flash('error', 'Title không được để trống.');
      return res.redirect('back');
    }
    if (patch.price != null && patch.price < 0) {
      res.flash('error', 'Giá không hợp lệ.');
      return res.redirect('back');
    }
    if (patch.promo_price != null && patch.price != null && patch.promo_price > patch.price) {
      res.flash('error', 'Giá khuyến mãi không được lớn hơn giá gốc.');
      return res.redirect('back');
    }

    // ✅ Category leaf
    const cat = await categoryModel.findById(patch.cat_id);
    if (!cat) {
      res.flash('error', 'Category không tồn tại.');
      return res.redirect('back');
    }
    const childrenCount = await categoryModel.countChildren?.(payload.cat_id);
    if (typeof childrenCount === 'number' && childrenCount > 0) {
      res.flash('error', 'Vui lòng chọn Category cấp 2 (không phải nhóm cha).');
      return res.redirect('back');
    }

    await courseModel.patch(id, patch);
    res.flash('success', 'Course updated successfully.');
    res.redirect('/instructor/my-courses');
  } catch (err) {
    next(err);
  }
});

// 📘 Mark Course Completed (chỉ khi đủ nội dung)
router.post('/courses/:id/complete', async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const me = await instructorModel.findByUserId(req.session.user.id);
    if (!me) return res.status(400).send('Instructor profile not found');

    const course = await courseModel.findById(id);
    if (!course) return res.sendStatus(404);
    if (course.instructor_id !== me.id) return res.sendStatus(403);

    const ok = await courseModel.canComplete(id);
    if (!ok) {
      res.flash('error', 'Khoá học chưa đủ nội dung (cần ít nhất 1 Chapter và 1 Lesson).');
      return res.redirect('back');
    }

    await courseModel.markCompleted(id);
    res.flash('success', 'Marked as completed.');
    res.redirect('/instructor/my-courses');
  } catch (err) {
    next(err);
  }
});

export default router;

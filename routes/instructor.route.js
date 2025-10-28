// routes/instructor.route.js
import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import sanitizeHtml from 'sanitize-html';

import * as courseModel from '../models/course.model.js';
import * as categoryModel from '../models/category.model.js';
import * as instructorModel from '../models/instructor.model.js';
import * as sectionModel from '../models/section.model.js';
import * as lessonModel from '../models/lesson.model.js';
import { authRequired, requireInstructor } from '../middlewares/auth.mdw.js';

const router = express.Router();

/* ----------------------------- Helper utils ----------------------------- */
function slugify(str = '') {
  return String(str)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
    .toLowerCase();
}

// Chuẩn hoá NaN -> null (cho các cột số)
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

// Lấy user trong session (tương thích cả 2 cách lưu)
function getSessionUser(req) {
  return req.session?.authUser || req.session?.user || null;
}

// Lấy instructor record từ session; trả về { user, inst } hoặc { error }
async function getInstructorFromSession(req) {
  const user = getSessionUser(req);
  if (!user) return { error: 'NOT_LOGGED_IN' };

  // user.id: id trong bảng users
  const inst = await instructorModel.findByUserId(user.id);
  if (!inst) return { error: 'NO_INSTRUCTOR_RECORD', user };

  return { user, inst };
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
router.use(authRequired, requireInstructor);

/* ------------------------------ Upload endpoint ------------------------------ */
router.post('/upload', upload.single('file'), (req, res) => {
  // Chuẩn hoá đường dẫn về dạng /uploads/...
  let relPath = req.file?.path?.replace(/^public[\\/]/, '') || '';
  relPath = relPath.split(path.sep).join('/');
  if (!relPath.startsWith('/')) relPath = '/' + relPath;
  return res.json({ url: relPath });
});

// Multer error handler → trả JSON để client hiển thị
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError || /Only .* allowed/i.test(err.message)) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

/* ============================ INSTRUCTOR FEATURE ============================ */

// 📘 My Courses list
router.get('/my-course', async (req, res, next) => {
  try {
    const got = await getInstructorFromSession(req);
    if (got.error === 'NOT_LOGGED_IN') {
      req.session.returnUrl = req.originalUrl;
      res.flash?.('warning', 'Vui lòng đăng nhập.');
      return res.redirect('/account/signin');
    }
    if (got.error === 'NO_INSTRUCTOR_RECORD') {
      res.flash?.('danger', 'Tài khoản chưa được gán quyền giảng viên.');
      return res.redirect('/');
    }
    const { inst: me } = got;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 6;
    const offset = (page - 1) * limit;

    const [rows, { amount }] = await Promise.all([
      courseModel.findPageByInstructor(me.id, offset, limit, { excludeRemoved: true }),
      courseModel.countByInstructor(me.id, { excludeRemoved: true }),
    ]);

    res.render('vwInstructor/my-course', {
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
    const got = await getInstructorFromSession(req);
    if (got.error === 'NOT_LOGGED_IN') {
      req.session.returnUrl = req.originalUrl;
      res.flash?.('warning', 'Vui lòng đăng nhập.');
      return res.redirect('/account/signin');
    }
    if (got.error === 'NO_INSTRUCTOR_RECORD') {
      res.flash?.('danger', 'Tài khoản chưa được gán quyền giảng viên.');
      return res.redirect('/');
    }
    const { inst: me } = got;

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

    // Validate số hợp lệ
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

    // Category leaf
    if (!Number.isFinite(payload.cat_id)) {
      res.flash('error', 'Category không hợp lệ.');
      return res.redirect('back');
    }
    const cat = await categoryModel.findById(payload.cat_id);
    if (!cat) {
      res.flash('error', 'Category không tồn tại.');
      return res.redirect('back');
    }
    const rowCC = await categoryModel.countChildren?.(payload.cat_id)
                 ?? await (async () => ({ amount: 0 }))(); // fallback nếu chưa có hàm
    const childCount = Number(rowCC?.amount ?? rowCC?.c ?? 0);
    if (childCount > 0) {
      res.flash('error', 'Vui lòng chọn Category cấp 2 (không phải nhóm cha).');
      return res.redirect('back');
    }

    await courseModel.add(payload);
    res.flash('success', 'Course created successfully.');
    res.redirect('/instructor/my-course');
  } catch (err) {
    next(err);
  }
});

// 📘 Edit Course form
router.get('/courses/:id/edit', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.sendStatus(400);

    const got = await getInstructorFromSession(req);
    if (got.error) return res.sendStatus(403);
    const { inst: me } = got;

    const course = await courseModel.findById(id);
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
    if (!Number.isFinite(id)) return res.sendStatus(400);

    const got = await getInstructorFromSession(req);
    if (got.error) return res.sendStatus(403);
    const { inst: me } = got;

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

    // Validate số hợp lệ
    if (patch.price == null && req.body.price?.trim()) {
      res.flash('error', 'Giá không hợp lệ.');
      return res.redirect('back');
    }
    if (patch.promo_price == null && req.body.promo_price?.trim()) {
      res.flash('error', 'Giá khuyến mãi không hợp lệ.');
      return res.redirect('back');
    }

    // Validate logic
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

    // Category leaf
    if (!Number.isFinite(patch.cat_id)) {
      res.flash('error', 'Category không hợp lệ.');
      return res.redirect('back');
    }
    const cat = await categoryModel.findById(patch.cat_id);
    if (!cat) {
      res.flash('error', 'Category không tồn tại.');
      return res.redirect('back');
    }
    const rowCC = await categoryModel.countChildren?.(patch.cat_id)
                 ?? await (async () => ({ amount: 0 }))();
    const childCount = Number(rowCC?.amount ?? rowCC?.c ?? 0);
    if (childCount > 0) {
      res.flash('error', 'Vui lòng chọn Category cấp 2 (không phải nhóm cha).');
      return res.redirect('back');
    }

    await courseModel.patch(id, patch);
    res.flash('success', 'Course updated successfully.');
    res.redirect('/instructor/my-course');
  } catch (err) {
    next(err);
  }
});

// 📘 Mark Course Completed (chỉ khi đủ nội dung)
router.post('/courses/:id/complete', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.sendStatus(400);

    const got = await getInstructorFromSession(req);
    if (got.error) return res.sendStatus(403);
    const { inst: me } = got;

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
    res.redirect('/instructor/my-course');
  } catch (err) {
    next(err);
  }
});

/* ===================== CONTENT MANAGEMENT (Sections & Lessons) ===================== */

// Trang quản lý nội dung: load Sections + Lessons
router.get('/courses/:id/content', async (req, res, next) => {
  try {
    const courseId = Number(req.params.id);
    if (!Number.isFinite(courseId)) return res.sendStatus(400);

    const got = await getInstructorFromSession(req);
    if (got.error) return res.sendStatus(403);
    const { inst: me } = got;

    const course = await courseModel.findById(courseId);
    if (!course) return res.sendStatus(404);
    if (course.instructor_id !== me.id) return res.sendStatus(403);

    const sections = await sectionModel.findByCourse(courseId);
    const sectionsWithLessons = await Promise.all(
      sections.map(async s => {
        const lessons = await lessonModel.findBySection(s.id);
        return { ...s, lessons };
      })
    );

    res.render('vwInstructor/sections', {
      title: 'Course Content',
      course,
      sections: sectionsWithLessons,
    });
  } catch (err) { next(err); }
});

// -------------------------- Sections CRUD --------------------------
router.post('/sections', async (req, res, next) => {
  try {
    const { course_id, title } = req.body;
    const order_no = Number(req.body.order_no) || 1;

    const got = await getInstructorFromSession(req);
    if (got.error) return res.sendStatus(403);
    const { inst: me } = got;

    const cId = Number(course_id);
    if (!Number.isFinite(cId)) return res.sendStatus(400);

    const course = await courseModel.findById(cId);
    if (!course) return res.sendStatus(404);
    if (course.instructor_id !== me.id) return res.sendStatus(403);

    if (!title?.trim()) {
      res.flash('error', 'Section title không được trống.');
      return res.redirect('back');
    }

    await sectionModel.add({ course_id: cId, title: title.trim(), order_no });
    res.flash('success', 'Section created.');
    res.redirect(`/instructor/courses/${cId}/content`);
  } catch (err) { next(err); }
});

router.post('/sections/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.sendStatus(400);

    const { title } = req.body;
    const order_no = Number(req.body.order_no) || 1;

    const sec = await sectionModel.findById(id);
    if (!sec) return res.sendStatus(404);

    const got = await getInstructorFromSession(req);
    if (got.error) return res.sendStatus(403);
    const { inst: me } = got;

    const course = await courseModel.findById(sec.course_id);
    if (!course || course.instructor_id !== me.id) return res.sendStatus(403);

    if (!title?.trim()) {
      res.flash('error', 'Section title không được trống.');
      return res.redirect('back');
    }

    await sectionModel.patch(id, { title: title.trim(), order_no });
    res.flash('success', 'Section updated.');
    res.redirect(`/instructor/courses/${sec.course_id}/content`);
  } catch (err) { next(err); }
});

router.post('/sections/:id/delete', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.sendStatus(400);

    const sec = await sectionModel.findById(id);
    if (!sec) return res.sendStatus(404);

    const got = await getInstructorFromSession(req);
    if (got.error) return res.sendStatus(403);
    const { inst: me } = got;

    const course = await courseModel.findById(sec.course_id);
    if (!course || course.instructor_id !== me.id) return res.sendStatus(403);

    const result = await sectionModel.safeRemove(id); // chỉ xoá khi không có lesson
    if (!result.ok) {
      res.flash('error', 'Không thể xoá section vì còn lesson.');
    } else {
      res.flash('success', 'Section deleted.');
    }
    res.redirect(`/instructor/courses/${sec.course_id}/content`);
  } catch (err) { next(err); }
});

// -------------------------- Lessons CRUD --------------------------
router.post('/lessons', async (req, res, next) => {
  try {
    const { section_id, title, video_url } = req.body;
    const duration_sec = req.body.duration_sec ? Number(req.body.duration_sec) : null;
    const is_preview = !!req.body.is_preview;
    const order_no = Number(req.body.order_no) || 1;

    const sId = Number(section_id);
    if (!Number.isFinite(sId)) return res.sendStatus(400);

    const sec = await sectionModel.findById(sId);
    if (!sec) return res.sendStatus(404);

    const got = await getInstructorFromSession(req);
    if (got.error) return res.sendStatus(403);
    const { inst: me } = got;

    const course = await courseModel.findById(sec.course_id);
    if (!course || course.instructor_id !== me.id) return res.sendStatus(403);

    if (!title?.trim()) {
      res.flash('error', 'Lesson title không được trống.');
      return res.redirect('back');
    }
    if (!video_url?.trim()) {
      res.flash('error', 'Vui lòng upload hoặc nhập Video URL.');
      return res.redirect('back');
    }

    await lessonModel.add({
      section_id: sId,
      title: title.trim(),
      video_url: video_url.trim(),
      duration_sec,
      is_preview,
      order_no,
    });

    res.flash('success', 'Lesson created.');
    res.redirect(`/instructor/courses/${sec.course_id}/content`);
  } catch (err) { next(err); }
});

router.post('/lessons/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.sendStatus(400);

    const { title, video_url } = req.body;
    const duration_sec = req.body.duration_sec ? Number(req.body.duration_sec) : null;
    const is_preview = !!req.body.is_preview;
    const order_no = Number(req.body.order_no) || 1;

    const les = await lessonModel.findById(id);
    if (!les) return res.sendStatus(404);

    const sec = await sectionModel.findById(les.section_id);
    if (!sec) return res.sendStatus(404);

    const got = await getInstructorFromSession(req);
    if (got.error) return res.sendStatus(403);
    const { inst: me } = got;

    const course = await courseModel.findById(sec.course_id);
    if (!course || course.instructor_id !== me.id) return res.sendStatus(403);

    if (!title?.trim()) {
      res.flash('error', 'Lesson title không được trống.');
      return res.redirect('back');
    }
    if (!video_url?.trim()) {
      res.flash('error', 'Vui lòng upload hoặc nhập Video URL.');
      return res.redirect('back');
    }

    await lessonModel.patch(id, {
      title: title.trim(),
      video_url: video_url.trim(),
      duration_sec,
      is_preview,
      order_no,
    });

    res.flash('success', 'Lesson updated.');
    res.redirect(`/instructor/courses/${sec.course_id}/content`);
  } catch (err) { next(err); }
});

router.post('/lessons/:id/delete', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.sendStatus(400);

    const les = await lessonModel.findById(id);
    if (!les) return res.sendStatus(404);

    const sec = await sectionModel.findById(les.section_id);
    if (!sec) return res.sendStatus(404);

    const got = await getInstructorFromSession(req);
    if (got.error) return res.sendStatus(403);
    const { inst: me } = got;

    const course = await courseModel.findById(sec.course_id);
    if (!course || course.instructor_id !== me.id) return res.sendStatus(403);

    await lessonModel.remove(id);
    res.flash('success', 'Lesson deleted.');
    res.redirect(`/instructor/courses/${sec.course_id}/content`);
  } catch (err) { next(err); }
});

export default router;

// routes/instructor.route.js
import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';

import * as courseModel from '../models/course.model.js';
import * as categoryModel from '../models/category.model.js';
import * as instructorModel from '../models/instructor.model.js';

const router = express.Router();

/* -------------------------- Auth middlewares (basic) -------------------------- */
function authRequired(req, res, next) {
  if (!req.session?.auth || !req.session.user) {
    req.session.flash = { type: 'warning', message: 'Vui lòng đăng nhập.' };
    return res.redirect('/account/login');
  }
  next();
}
function requireInstructor(req, res, next) {
  if (req.session.user?.role !== 'instructor') {
    return res.sendStatus(403);
  }
  next();
}

/* ---------------------------------- Helpers --------------------------------- */
function slugify(str = '') {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

/* ------------------------------- Multer setup ------------------------------- */
const uploadDir = 'public/uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const base = path.basename(file.originalname || 'file', ext);
    cb(null, `${slugify(base)}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

/* =============================== INSTRUCTOR UI ============================== */

/** GET /instructor/my-courses
 *  Liệt kê course của chính instructor (phân trang)
 *  View: vwCourse/my-courses.hbs
 */
router.get(
  '/my-courses',
  authRequired,
  requireInstructor,
  async (req, res, next) => {
    try {
      const instructorUserId = req.session.user.id;
      // Lấy instructor_id từ user_id
      const ins = await instructorModel.findByUserId(instructorUserId);
      if (!ins) return res.status(404).send('Không tìm thấy instructor.');

      const page = Math.max(parseInt(req.query.page || '1', 10), 1);
      const limit = Math.max(parseInt(req.query.limit || '8', 10), 1);
      const offset = (page - 1) * limit;

      // Model bạn cần có: findPageByInstructor(instructorId, offset, limit)
      // và countByInstructor(instructorId)
      const [rows, cnt] = await Promise.all([
        courseModel.findPageByInstructor(ins.id, offset, limit),
        courseModel.countByInstructor(ins.id),
      ]);

      const total = Number(cnt?.amount ?? cnt?.count ?? 0);
      const totalPages = Math.max(Math.ceil(total / limit), 1);

      res.render('vwCourse/my-courses', {
        courses: rows,
        page,
        totalPages,
        limit,
      });
    } catch (err) {
      next(err);
    }
  }
);

/** GET /instructor/courses/new
 *  Form tạo course
 *  View: vwCourse/course-form.hbs
 */
router.get(
  '/courses/new',
  authRequired,
  requireInstructor,
  async (_req, res, next) => {
    try {
      const categories = await categoryModel.findAll();
      res.render('vwCourse/course-form', {
        isNew: true,
        categories,
        course: {},
      });
    } catch (err) {
      next(err);
    }
  }
);

/** POST /instructor/courses
 *  Tạo course mới
 */
router.post(
  '/courses',
  authRequired,
  requireInstructor,
  async (req, res, next) => {
    try {
      const instructorUserId = req.session.user.id;
      const ins = await instructorModel.findByUserId(instructorUserId);
      if (!ins) return res.status(404).send('Không tìm thấy instructor.');

      const {
        title,
        short_desc,
        long_desc_html,
        cover_url, // nếu upload client-side -> gửi đường dẫn; hoặc dùng /upload ở dưới
        price,
        promo_price,
        cat_id,
      } = req.body;

      const course = {
        instructor_id: ins.id,
        cat_id: Number(cat_id),
        title: title?.trim(),
        short_desc: short_desc?.trim(),
        long_desc_html: long_desc_html || '',
        cover_url: cover_url || null,
        price: Number(price || 0),
        promo_price: promo_price ? Number(promo_price) : null,
        slug: slugify(title),
        is_hidden: false,
        is_completed: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Model: add(course) -> returning id
      const inserted = await courseModel.add(course);
      const courseId =
        Array.isArray(inserted) ? inserted[0]?.id || inserted[0] : inserted?.id;

      req.session.flash = { type: 'success', message: 'Tạo khoá học thành công!' };
      return res.redirect(`/instructor/courses/${courseId}/edit`);
    } catch (err) {
      next(err);
    }
  }
);

/** GET /instructor/courses/:id/edit
 *  Sửa course
 *  View: vwCourse/course-form.hbs
 */
router.get(
  '/courses/:id/edit',
  authRequired,
  requireInstructor,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const course = await courseModel.findById(id);
      if (!course) return res.sendStatus(404);

      const categories = await categoryModel.findAll();
      res.render('vwCourse/course-form', {
        isNew: false,
        categories,
        course,
      });
    } catch (err) {
      next(err);
    }
  }
);

/** POST /instructor/courses/:id
 *  Cập nhật course
 */
router.post(
  '/courses/:id',
  authRequired,
  requireInstructor,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const {
        title,
        short_desc,
        long_desc_html,
        cover_url,
        price,
        promo_price,
        cat_id,
      } = req.body;

      const patch = {
        title: title?.trim(),
        short_desc: short_desc?.trim(),
        long_desc_html: long_desc_html || '',
        cover_url: cover_url || null,
        price: Number(price || 0),
        promo_price: promo_price ? Number(promo_price) : null,
        cat_id: Number(cat_id),
        slug: slugify(title),
        updated_at: new Date(),
      };

      await courseModel.updateById(id, patch);
      req.session.flash = { type: 'success', message: 'Cập nhật khoá học thành công!' };
      res.redirect(`/instructor/courses/${id}/edit`);
    } catch (err) {
      next(err);
    }
  }
);

/** POST /instructor/courses/:id/complete
 *  Đánh dấu đủ nội dung
 */
router.post(
  '/courses/:id/complete',
  authRequired,
  requireInstructor,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      await courseModel.updateById(id, { is_completed: true, updated_at: new Date() });
      req.session.flash = { type: 'success', message: 'Đã đánh dấu hoàn thành.' };
      res.redirect('/instructor/my-courses');
    } catch (err) {
      next(err);
    }
  }
);

/** POST /instructor/upload
 *  Upload file (thumbnail/video) – dùng Uppy/Multer
 *  Client gửi field 'file'
 *  Trả về JSON: { url: '/uploads/xxx.ext' }
 */
router.post(
  '/upload',
  authRequired,
  requireInstructor,
  upload.single('file'),
  (req, res) => {
    const relPath = req.file?.path?.replace(/^public/, '') || '';
    return res.json({ url: relPath });
  }
);

export default router;

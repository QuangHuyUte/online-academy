// routes/admin.route.js
import express from 'express';
import * as categoryModel from '../models/category.model.js';
import * as courseModel from '../models/course.model.js';
import { authRequired, requireAdmin } from '../middlewares/auth.mdw.js'; // giữ đúng tên folder bạn đang dùng

const router = express.Router();

// Áp dụng middleware cho toàn bộ admin routes
router.use(authRequired, requireAdmin);

/* =============================== CATEGORY CRUD =============================== */

// 📘 List Categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await categoryModel.findAll();
    res.render('vwAdminCategory/index', { title: 'Categories', categories });
  } catch (err) {
    next(err);
  }
});

// 📘 New Category Form
router.get('/categories/new', (req, res) => {
  res.render('vwAdminCategory/form', { title: 'New Category', category: {} });
});

// 📘 Create Category
router.post('/categories', async (req, res, next) => {
  try {
    await categoryModel.add({
      name: req.body.name?.trim(),
      slug: req.body.slug?.trim(),
      parent_id: req.body.parent_id || null,
    });
    req.session.flash = { type: 'success', message: 'Category created successfully.' };
    res.redirect('/admin/categories');
  } catch (err) {
    next(err);
  }
});

// 📘 Edit Category Form
router.get('/categories/:id/edit', async (req, res, next) => {
  try {
    const category = await categoryModel.findById(req.params.id);
    if (!category) return res.sendStatus(404);

    const parents = await categoryModel.findAll();
    res.render('vwAdminCategory/form', {
      title: 'Edit Category',
      category,
      parents,
    });
  } catch (err) {
    next(err);
  }
});

// 📘 Update Category
router.post('/categories/:id', async (req, res, next) => {
  try {
    await categoryModel.patch(req.params.id, {
      name: req.body.name?.trim(),
      slug: req.body.slug?.trim(),
      parent_id: req.body.parent_id || null,
    });
    req.session.flash = { type: 'success', message: 'Category updated.' };
    res.redirect('/admin/categories');
  } catch (err) {
    next(err);
  }
});

// 📘 Delete Category (chặn xoá nếu đã có course)
router.post('/categories/:id/delete', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const cnt = await courseModel.countByCat(id);        // { amount: '3' } (Postgres trả string)
    const total = Number(cnt?.amount ?? 0);              // ép number để so sánh an toàn
    if (total > 0) {
      req.session.flash = {
        type: 'danger',
        message: 'Cannot delete — category already has courses.',
      };
      return res.redirect('/admin/categories');
    }

    await categoryModel.remove(id);
    req.session.flash = { type: 'success', message: 'Category deleted.' };
    res.redirect('/admin/categories');
  } catch (err) {
    next(err);
  }
});

/* =============================== COURSE ADMIN =============================== */

// 📘 List all courses (optional search)
router.get('/courses', async (req, res, next) => {
  try {
    const q = req.query.q?.trim() || '';
    const offset = 0;
    const limit = 20;
    // Admin có thể xem cả course đã remove; view kiểm tra course.is_removed để hiển thị trạng thái
    const courses = await courseModel.findPageAdmin(offset, limit, q);
    res.render('vwAdminCourse/index', { title: 'Courses', courses, q });
  } catch (err) {
    next(err);
  }
});

// 📘 Toggle Remove / Restore Course (dùng is_removed thay cho is_hidden)
router.post('/courses/:id/remove', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const course = await courseModel.findById(id);
    if (!course) return res.sendStatus(404);

    const removed = !course.is_removed; // đảo trạng thái
    await courseModel.patch(id, { is_removed: removed });

    req.session.flash = {
      type: 'success',
      message: removed ? 'Course removed (soft-delete).' : 'Course restored.',
    };
    res.redirect('/admin/courses');
  } catch (err) {
    next(err);
  }
});

export default router;

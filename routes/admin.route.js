import express from 'express';
import * as categoryModel from '../models/category.model.js';
import * as courseModel from '../models/course.model.js';
import { authRequired, requireAdmin } from '../middlewares/auth.mdw.js'; 

const router = express.Router();
//router.use(authRequired, requireAdmin);

/* =============================== CATEGORY CRUD =============================== */

// List Categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await categoryModel.findAllWithParent();
    res.render('vwAdminCategory/index', { title: 'Categories', categories });
  } catch (err) { next(err); }
});

// New Category Form
router.get('/categories/new', async (req, res, next) => {
  try {
    const parents = await categoryModel.findByParent(null);
    res.render('vwAdminCategory/form', { title: 'New Category', category: {}, parents });
  } catch (err) { next(err); }
});

// Create Category
router.post('/categories', async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    if (!name) { res.flash('error','Name không được trống.'); return res.redirect('back'); } 
    
    // chuẩn hoá/auto slug 
    let slug = (req.body.slug?.trim() || '') 
      .toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''); 
    if (!slug) slug = name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');

    let parent_id = req.body.parent_id;
    if (parent_id === '' || parent_id === 'null' || parent_id == null) parent_id = null;
    else parent_id = Number(parent_id);

    // parent phải là cấp 1 (parent.parent_id IS NULL)
    if (parent_id != null) {
    const parent = await categoryModel.findById(parent_id);
    if (!parent) { res.flash('error','Parent không tồn tại.'); return res.redirect('back'); }
    if (parent.parent_id != null) {
        res.flash('error','Chỉ được chọn danh mục cấp 1 làm cha.');
      return res.redirect('back');
      }
    }

    await categoryModel.add({ name, slug, parent_id });
    res.flash('success', 'Category created successfully.');
    res.redirect('/admin/categories');
  } catch (err) {
    // Unique slug (PG 23505)
    if (err?.code === '23505') {
      res.flash('error', 'Slug đã tồn tại. Vui lòng chọn slug khác.');
      return res.redirect('back');
    }
    next(err);
  }
});

// Edit Category Form
router.get('/categories/:id/edit', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const category = await categoryModel.findById(id);
    if (!category) return res.sendStatus(404);

    let parents = await categoryModel.findByParent(null);
    parents = parents.filter(p => p.id !== id);
    res.render('vwAdminCategory/form', { title: 'Edit Category', category, parents });
  } catch (err) { next(err); }
});

// Update Category
router.post('/categories/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!name) { res.flash('error','Name không được trống.'); return res.redirect('back'); }
    let slug = (req.body.slug?.trim() || '')
      .toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    if (!slug) slug = name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');

    let parent_id = req.body.parent_id;
    if (parent_id === '' || parent_id === 'null' || parent_id == null) parent_id = null;
    else parent_id = Number(parent_id);

    // chặn tự làm parent của chính mình
    if (parent_id != null && Number(parent_id) === id) {
      res.flash('error', 'Category không thể là cha của chính nó.');
      return res.redirect('back');
    }

    // parent phải là cấp 1
    if (parent_id != null) {
      const parent = await categoryModel.findById(parent_id);
      if (!parent) { res.flash('error','Parent không tồn tại.'); return res.redirect('back'); }
      if (parent.parent_id != null) {
        res.flash('error','Chỉ được chọn danh mục cấp 1 làm cha.');
        return res.redirect('back');
      }
    } 

    await categoryModel.patch(id, { name, slug, parent_id });
    res.flash('success', 'Category updated.');
    res.redirect('/admin/categories');
  } catch (err) {
    if (err?.code === '23505') {
      res.flash('error', 'Slug đã tồn tại. Vui lòng chọn slug khác.');
      return res.redirect('back');
    }
    next(err);
  }
});

// Delete Category (safe)
router.post('/categories/:id/delete', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await categoryModel.safeRemove(id);
    if (!result.ok) {
      res.flash('danger', 'Cannot delete — category has courses or child categories.');
      return res.redirect('/admin/categories');
    }
    res.flash('success', 'Category deleted.');
    res.redirect('/admin/categories');
  } catch (err) { next(err); }
});

/* =============================== COURSE ADMIN =============================== */

// List all courses with paging + optional search
router.get('/courses', async (req, res, next) => {
  try {
    const q = req.query.q?.trim() || '';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    const [courses, { amount }] = await Promise.all([
      courseModel.findPageAdmin(offset, limit, q, { showRemoved: true }),
      courseModel.countAdmin(q),
    ]);

    const totalPages = Math.max(1, Math.ceil(Number(amount) / limit));
    res.render('vwAdminCourse/index', {
      title: 'Courses',
      courses,
      q,
      page,
      totalPages,
      offset,
      // nếu dùng helper buildPagination thì view sẽ tự render
    });
  } catch (err) { next(err); }
});

// Toggle Remove / Restore Course
router.post('/courses/:id/remove', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const course = await courseModel.findById(id);
    if (!course) return res.sendStatus(404);

    const removed = !course.is_removed; // đảo trạng thái
    await courseModel.setRemoved(id, removed); // cập nhật kèm last_updated_at

    res.flash('success', removed ? 'Course removed (soft-delete).' : 'Course restored.');
    res.redirect('/admin/courses');
  } catch (err) { next(err); }
});

export default router;

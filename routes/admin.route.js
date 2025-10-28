// routes/admin.route.js
import express from 'express';
import * as categoryModel from '../models/category.model.js';
import * as courseModel from '../models/course.model.js';
import * as userModel from '../models/user.model.js';
import * as instructorModel from '../models/instructor.model.js';
import { authRequired, requireAdmin } from '../middlewares/auth.mdw.js';
import db from '../utils/db.js';

const router = express.Router();
router.use(authRequired, requireAdmin);

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
    if (!name) { res.flash('error', 'Name không được trống.'); return res.redirect('back'); }

    // chuẩn hoá/auto slug
    let slug = (req.body.slug?.trim() || '')
      .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!slug) slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    let parent_id = req.body.parent_id;
    if (parent_id === '' || parent_id === 'null' || parent_id == null) parent_id = null;
    else parent_id = Number(parent_id);

    // parent phải là cấp 1 (parent.parent_id IS NULL)
    if (parent_id != null) {
      const parent = await categoryModel.findById(parent_id);
      if (!parent) { res.flash('error', 'Parent không tồn tại.'); return res.redirect('back'); }
      if (parent.parent_id != null) {
        res.flash('error', 'Chỉ được chọn danh mục cấp 1 làm cha.');
        return res.redirect('back');
      }
    }

    await categoryModel.add({ name, slug, parent_id });
    res.flash('success', 'Category created successfully.');
    res.redirect('/admin/categories');
  } catch (err) {
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
    if (!Number.isFinite(id)) return res.sendStatus(400);

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
    if (!Number.isFinite(id)) return res.sendStatus(400);

    const name = req.body.name?.trim();
    if (!name) { res.flash('error', 'Name không được trống.'); return res.redirect('back'); }

    let slug = (req.body.slug?.trim() || '')
      .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!slug) slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    let parent_id = req.body.parent_id;
    if (parent_id === '' || parent_id === 'null' || parent_id == null) parent_id = null;
    else parent_id = Number(parent_id);

    if (parent_id != null && parent_id === id) {
      res.flash('error', 'Category không thể là cha của chính nó.');
      return res.redirect('back');
    }

    if (parent_id != null) {
      const parent = await categoryModel.findById(parent_id);
      if (!parent) { res.flash('error', 'Parent không tồn tại.'); return res.redirect('back'); }
      if (parent.parent_id != null) {
        res.flash('error', 'Chỉ được chọn danh mục cấp 1 làm cha.');
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
    if (!Number.isFinite(id)) return res.sendStatus(400);

    const result = await categoryModel.safeRemove(id);
    if (!result.ok) {
      res.flash('error', 'Cannot delete — category has courses or child categories.');
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
    });
  } catch (err) { next(err); }
});

// Toggle Remove / Restore Course
router.post('/courses/:id/remove', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.sendStatus(400);

    const course = await courseModel.findById(id);
    if (!course) return res.sendStatus(404);

    const removed = !course.is_removed;
    await courseModel.setRemoved(id, removed);

    res.flash('success', removed ? 'Course removed (soft-delete).' : 'Course restored.');

    const q = req.body.q?.trim() || '';
    const page = Math.max(1, Number(req.body.page) || 1);
    return res.redirect(`/admin/courses?q=${encodeURIComponent(q)}&page=${page}`);
  } catch (err) { next(err); }
});

/* ============================== ADMIN: INSTRUCTORS ============================== */

// GET /admin/instructors?q=&page=
router.get('/instructors', async (req, res, next) => {
  try {
    const q = req.query.q?.trim() || '';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    const [rows, { amount }] = await Promise.all([
      instructorModel.findPage(offset, limit, q),
      instructorModel.countAll(q),
    ]);

    const totalPages = Math.max(1, Math.ceil(Number(amount || 0) / limit));

    res.render('vwAdminInstructor/index', {
      title: 'Instructors',
      instructors: rows, // i.*, u.name, u.email
      q,
      page,
      totalPages,
      offset,
    });
  } catch (err) { next(err); }
});

// GET /admin/instructors/:id (view detail + khóa dạy gần đây kèm tên category)
router.get('/instructors/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const inst = await instructorModel.findById(id);
    if (!inst) return res.sendStatus(404);

    // user kèm name/email
    const user = await userModel.findById?.(inst.user_id)
               || await db('users').where('id', inst.user_id).first();

    // lấy 10 khóa gần nhất + JOIN categories để có tên danh mục
    const courses = await db('courses as c')
      .leftJoin('categories as cat', 'cat.id', 'c.cat_id')
      .where('c.instructor_id', id)
      .select('c.*', 'cat.name as category')
      .orderBy('c.last_updated_at', 'desc')
      .limit(10);

    // tổng số khóa
    const { amount } = await instructorModel.countCourses(id);

    res.render('vwAdminInstructor/detail', {
      title: 'Instructor Detail',
      instructor: { ...inst, name: user?.name, email: user?.email },
      courses,                        // => mỗi course có field 'category'
      totalCourses: Number(amount || 0),
    });
  } catch (err) { next(err); }
});

// GET /admin/instructors/:id (view detail + khóa dạy gần đây kèm tên category)
router.get('/instructors/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const inst = await instructorModel.findById(id);
    if (!inst) return res.sendStatus(404);

    // user kèm name/email
    const user = await userModel.findById?.(inst.user_id)
               || await db('users').where('id', inst.user_id).first();

    // lấy 10 khóa gần nhất + JOIN categories để có tên danh mục
    const courses = await db('courses as c')
      .leftJoin('categories as cat', 'cat.id', 'c.cat_id')
      .where('c.instructor_id', id)
      .select('c.*', 'cat.name as category')
      .orderBy('c.last_updated_at', 'desc')
      .limit(10);

    // tổng số khóa
    const { amount } = await instructorModel.countCourses(id);

    res.render('vwAdminInstructor/detail', {
      title: 'Instructor Detail',
      instructor: { ...inst, name: user?.name, email: user?.email },
      courses,                        // => mỗi course có field 'category'
      totalCourses: Number(amount || 0),
    });
  } catch (err) { next(err); }
});

/* ================================ ADMIN: STUDENTS =============================== */

// Nếu chưa có hàm riêng trong userModel, dùng 2 helper dưới:
async function findStudentsPage(offset, limit, keyword = '') {
  const q = db('users').where('role', 'student').orderBy('id', 'asc').offset(offset).limit(limit);
  if (keyword) q.andWhere(builder => {
    builder.whereILike('name', `%${keyword}%`).orWhereILike('email', `%${keyword}%`);
  });
  return q;
}
async function countStudents(keyword = '') {
  const q = db('users').where('role', 'student').count('* as amount').first();
  if (keyword) q.andWhere(builder => {
    builder.whereILike('name', `%${keyword}%`).orWhereILike('email', `%${keyword}%`);
  });
  return q;
}

// GET /admin/students?q=&page=
router.get('/students', async (req, res, next) => {
  try {
    const q = req.query.q?.trim() || '';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    const [rows, { amount }] = await Promise.all([
      findStudentsPage(offset, limit, q),
      countStudents(q),
    ]);

    const totalPages = Math.max(1, Math.ceil(Number(amount || 0) / limit));

    res.render('vwAdminStudent/index', {
      title: 'Students',
      students: rows,
      q,
      page,
      totalPages,
      offset,
    });
  } catch (err) { next(err); }
});

// GET /admin/students/:id
router.get('/students/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.sendStatus(400);

    const student = (await userModel.findById?.(id)) || (await db('users').where({ id }).first());
    if (!student || student.role !== 'student') return res.sendStatus(404);

    const enrolls = await db('enrollments as e')
      .join('courses as c', 'c.id', 'e.course_id')
      .leftJoin('categories as cat', 'cat.id', 'c.cat_id')
      .leftJoin('instructors as i', 'i.id', 'c.instructor_id')
      .leftJoin('users as iu', 'iu.id', 'i.user_id')
      .where('e.user_id', id)
      .select(
        'e.purchased_at',
        'c.id as course_id',
        'c.title as course_title',
        'cat.name as category',
        'iu.name as instructor'
      )
      .orderBy('e.purchased_at', 'desc')
      .limit(10);

    res.render('vwAdminStudent/detail', {
      title: 'Student Detail',
      student,
      enrolls,
    });
  } catch (err) { next(err); }
});

export default router;

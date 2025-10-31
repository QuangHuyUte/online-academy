// routes/admin.route.js
import express from 'express';
import bcrypt from 'bcryptjs';

import * as categoryModel from '../models/category.model.js';
import * as courseModel from '../models/course.model.js';
import * as userModel from '../models/user.model.js';
import * as instructorModel from '../models/instructor.model.js';
import * as studentModel from '../models/students.model.js';

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
    if (!name) { res.flash('error', 'Name must not be empty.'); return res.redirect('back'); }

    // chuẩn hoá/auto slug
    let slug = (req.body.slug?.trim() || '')
      .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!slug) slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    let parent_id = req.body.parent_id;
    if (parent_id === '' || parent_id === 'null' || parent_id == null) parent_id = null;
    else parent_id = Number(parent_id);

    // parent phải là cấp 1
    if (parent_id != null) {
      const parent = await categoryModel.findById(parent_id);
      if (!parent) { res.flash('error', 'Parent not found.'); return res.redirect('back'); }
      if (parent.parent_id != null) {
        res.flash('error', 'Only a level-1 category can be selected as parent.');
        return res.redirect('back');
      }
    }

    await categoryModel.add({ name, slug, parent_id });
    res.flash('success', 'Category created successfully.');
    res.redirect('/admin/categories');
  } catch (err) {
    if (err?.code === '23505') {
      res.flash('error', 'Slug already exists. Please select another slug.');
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

    const nameRaw = req.body.name ?? '';
    const name = nameRaw.trim();
    if (!name) {
      const category = await categoryModel.findById(id);
      const parents = (await categoryModel.findByParent(null)).filter(p => p.id !== id);
      return res.status(400).render('vwAdminCategory/form', {
        title: 'Edit Category',
        category: { ...(category || {}), name, slug: req.body.slug?.trim() || '', parent_id: normalizeParentId(req.body.parent_id) },
        parents,
        error: 'Name must not be empty.',
      });
    }

    let slug = (req.body.slug?.trim() || '')
      .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!slug) slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    let parent_id = normalizeParentId(req.body.parent_id);

    if (parent_id != null && parent_id === id) {
      const category = await categoryModel.findById(id);
      const parents = (await categoryModel.findByParent(null)).filter(p => p.id !== id);
      return res.status(400).render('vwAdminCategory/form', {
        title: 'Edit Category',
        category: { ...(category || {}), name, slug, parent_id },
        parents,
        error: 'Category cannot be its own parent.',
      });
    }

    if (parent_id != null) {
      const parent = await categoryModel.findById(parent_id);
      if (!parent) {
        const category = await categoryModel.findById(id);
        const parents = (await categoryModel.findByParent(null)).filter(p => p.id !== id);
        return res.status(400).render('vwAdminCategory/form', {
          title: 'Edit Category',
          category: { ...(category || {}), name, slug, parent_id },
          parents,
          error: 'Parent not found.',
        });
      }
      if (parent.parent_id != null) {
        const category = await categoryModel.findById(id);
        const parents = (await categoryModel.findByParent(null)).filter(p => p.id !== id);
        return res.status(400).render('vwAdminCategory/form', {
          title: 'Edit Category',
          category: { ...(category || {}), name, slug, parent_id },
          parents,
          error: 'Only a level-1 category can be selected as parent.',
        });
      }
    }

    // --- Check trùng tên (ngoại trừ chính nó)
    const dupByName = await db('categories')
      .whereRaw('LOWER(name) = LOWER(?)', [name])
      .andWhere(builder => {
        if (parent_id == null) builder.whereNull('parent_id');
        else builder.where('parent_id', parent_id);
      })
      .andWhereNot('id', id)
      .first();

    if (dupByName) {
      const category = await categoryModel.findById(id);
      const parents = (await categoryModel.findByParent(null)).filter(p => p.id !== id);
      return res.status(400).render('vwAdminCategory/form', {
        title: 'Edit Category',
        category: { ...(category || {}), name, slug, parent_id },
        parents,
        error: parent_id == null
          ? 'Category group name already exists.'
          : 'Category name already exists under this parent.',
      });
    }

    // --- Check trùng slug (ngoại trừ chính nó)
    const dupSlug = await db('categories')
      .whereRaw('LOWER(slug) = LOWER(?)', [slug])
      .andWhereNot('id', id)
      .first();

    if (dupSlug) {
      const category = await categoryModel.findById(id);
      const parents = (await categoryModel.findByParent(null)).filter(p => p.id !== id);
      return res.status(400).render('vwAdminCategory/form', {
        title: 'Edit Category',
        category: { ...(category || {}), name, slug, parent_id },
        parents,
        error: 'Slug already exists. Please choose another slug.',
      });
    }

    await categoryModel.patch(id, { name, slug, parent_id });
    res.flash('success', 'Category updated.');
    res.redirect('/admin/categories');
  } catch (err) {
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
router.get('/courses', async (req, res) => {
  const limit  = 10;
  const page   = Math.max(1, parseInt(req.query.page, 10) || 1);
  const offset = (page - 1) * limit;

  const q = (req.query.q || '').trim();

  const parseId = (v) => {
    const s = String(v ?? '').trim().toLowerCase();
    if (!s || s === 'null' || s === 'undefined') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const catId        = parseId(req.query.cat_id);
  const instructorId = parseId(req.query.instructor_id);
  const showRemoved  = String(req.query.showRemoved || '') === '1';

  const [categoriesRaw, instructorsRaw, list, totalRow] = await Promise.all([
    categoryModel.findAllWithParent(),
    instructorModel.findAll(),
    courseModel.findPageAdmin(offset, limit, q, { showRemoved, catId, instructorId }),
    courseModel.countAdmin(q, { showRemoved, catId, instructorId }),
  ]);

  const categories = categoriesRaw.map(c => ({
    id: c.id, name: c.name,
    parent_name: c.parent_id ? categoriesRaw.find(p => p.id === c.parent_id)?.name : null,
  }));

  const instructors = instructorsRaw.map(i => ({ id: i.id, name: i.name }));

  const total      = Number(totalRow?.amount || 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const catQS = catId ? String(catId) : '';
  const insQS = instructorId ? String(instructorId) : '';
  const srQS  = showRemoved ? '1' : '';

  res.render('vwAdminCourse/index', {
    courses: list,
    q, page, totalPages, offset,
    categories, instructors,
    selectedCatId: catId,
    selectedInstructorId: instructorId,
    showRemoved,
    catQS, insQS, srQS,
  });
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

    // giữ lại toàn bộ filter từ form
    const q   = (req.body.q || '').trim();
    const page = Math.max(1, Number(req.body.page) || 1);
    const cat_id        = (req.body.cat_id || '').trim();
    const instructor_id = (req.body.instructor_id || '').trim();
    let showRemoved     = (req.body.showRemoved === '1') ? '1' : '';
    if (removed) showRemoved = '1';

    const url =
      `/admin/courses` +
      `?q=${encodeURIComponent(q)}` +
      `&page=${page}` +
      `&cat_id=${encodeURIComponent(cat_id)}` +
      `&instructor_id=${encodeURIComponent(instructor_id)}` +
      `&showRemoved=${showRemoved}`;

    return res.redirect(url);
  } catch (err) { next(err); }
});

/* ============================== ADMIN: INSTRUCTORS ============================== */

// LIST
router.get('/instructors', async (req, res, next) => {
  try {
    const q = req.query.q?.trim() || '';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    const [rows, { amount }] = await Promise.all([
      instructorModel.findPage(offset, limit, q),
      instructorModel.count(q),
    ]);

    const total = Number(amount || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.render('vwAdminInstructor/index', {
      title: 'Instructors',
      instructors: rows, // i.*, u.name, u.email, u.is_available
      q, page, totalPages, offset,
    });
  } catch (err) {
    console.error('Error in GET /admin/instructors:', err);
    next(err);
  }
});

// NEW (đặt trước :id)
router.get('/instructors/new', async (req, res, next) => {
  try {
    res.render('vwAdminInstructor/addinstructor', { title: 'Add Instructor' });
  } catch (err) { next(err); }
});

// CREATE / PROMOTE
router.post('/instructors', async (req, res, next) => {
  try {
    const mode = (req.body.mode || 'existing').toLowerCase();

    const bio = (req.body.bio || '').trim() || null;
    const avatar_url = (req.body.avatar_url || '').trim() || null;

    if (mode === 'existing') {
      const email = (req.body.email || '').trim();
      if (!email) { res.flash('danger', 'Please provide an email of an existing user.'); return res.redirect('back'); }

      const existingUser = await userModel.findByEmail(email);
      if (!existingUser) { res.flash('danger', 'User not found by this email.'); return res.redirect('back'); }

      if (existingUser.role !== 'instructor') {
        await userModel.patch(existingUser.id, { role: 'instructor' });
      }
      await userModel.setAvailability(existingUser.id, true);

      const existedInstructor = await instructorModel.findByUserId(existingUser.id);
      if (!existedInstructor) {
        await instructorModel.add({ user_id: existingUser.id, bio, avatar_url });
      } else {
        const patchObj = {};
        if (bio) patchObj.bio = bio;
        if (avatar_url) patchObj.avatar_url = avatar_url;
        if (Object.keys(patchObj).length) await instructorModel.patch(existedInstructor.id, patchObj);
      }

      res.flash('success', `Promoted ${existingUser.email} to instructor.`);
      return res.redirect('/admin/instructors');

    } else if (mode === 'new') {
      const name = (req.body.name || '').trim();
      const email = (req.body.email || '').trim();
      let password = (req.body.password || '').trim();

      if (!name || !email) { res.flash('danger', 'Name and Email are required.'); return res.redirect('back'); }

      const dup = await userModel.findByEmail(email);
      if (dup) { res.flash('danger', 'Email already exists. Please choose another.'); return res.redirect('back'); }

      if (!password) password = Math.random().toString(36).slice(-8);
      const password_hash = bcrypt.hashSync(password, 10);

      const userId = await userModel.add({
        name, email, password_hash, role: 'instructor', is_available: true,
      });

      await instructorModel.add({ user_id: userId, bio, avatar_url });

      res.flash('success', `Created instructor ${email} successfully.`);
      return res.redirect('/admin/instructors');
    }

    res.flash('danger', 'Invalid mode.');
    res.redirect('back');
  } catch (err) {
    console.error('Error creating instructor:', err);
    if (err?.code === '23505') {
      res.flash('danger', 'Email already exists.');
      return res.redirect('back');
    }
    next(err);
  }
});

// DETAIL (đặt sau /new và POST)
router.get('/instructors/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.sendStatus(400);

    const inst = await instructorModel.findById(id);
    if (!inst) return res.sendStatus(404);

    const user = await userModel.findById?.(inst.user_id)
               || await db('users').where('id', inst.user_id).first();

    const courses = await db('courses as c')
      .leftJoin('categories as cat', 'cat.id', 'c.cat_id')
      .where('c.instructor_id', id)
      .select('c.*', 'cat.name as category')
      .orderBy('c.last_updated_at', 'desc')
      .limit(10);

    const { amount } = await instructorModel.countCourses(id);

    res.render('vwAdminInstructor/detail', {
      title: 'Instructor Detail',
      instructor: { ...inst, name: user?.name, email: user?.email },
      courses,
      totalCourses: Number(amount || 0),
    });
  } catch (err) { next(err); }
});

// AVAILABILITY
router.post('/instructors/:id/availability', async (req, res) => {
  const id = Number(req.params.id);
  const { available, q, page } = req.body;

  try {
    if (!Number.isFinite(id)) {
      res.flash('danger', 'Invalid instructor id.');
      return res.redirect(`/admin/instructors?q=${encodeURIComponent(q||'')}&page=${page||1}`);
    }

    const inst = await instructorModel.findByIdWithUser(id);
    if (!inst) {
      res.flash('danger', 'Instructor not found.');
      return res.redirect(`/admin/instructors?q=${encodeURIComponent(q||'')}&page=${page||1}`);
    }

    const newValue = available === '1';
    await userModel.setAvailability(inst.user_id, newValue);

    res.flash('success', newValue ? 'Instructor account activated.' : 'Instructor account locked.');
    res.redirect(`/admin/instructors?q=${encodeURIComponent(q||'')}&page=${page||1}`);
  } catch (err) {
    console.error(err);
    res.flash('danger', 'Error updating account status.');
    res.redirect(`/admin/instructors?q=${encodeURIComponent(q||'')}&page=${page||1}`);
  }
});

/* ================================ ADMIN: STUDENTS =============================== */

// LIST
router.get('/students', async (req, res, next) => {
  try {
    const q = req.query.q?.trim() || '';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    const [rows, { amount }] = await Promise.all([
      studentModel.findPage(offset, limit, q),
      studentModel.count(q),
    ]);

    const total = Number(amount || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.render('vwAdminStudent/index', {
      title: 'Students',
      students: rows,
      q,
      page,
      totalPages,
      offset,
    });
  } catch (err) {
    console.error('Error in /admin/students:', err);
    next(err);
  }
});

// DETAIL
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

// AVAILABILITY
router.post('/students/:id/availability', async (req, res) => {
  const id = Number(req.params.id) || 0;
  const { available, q, page } = req.body;

  try {
    if (!Number.isFinite(id)) {
      res.flash('danger', 'Invalid student id.');
      return res.redirect(`/admin/students?q=${encodeURIComponent(q || '')}&page=${page || 1}`);
    }

    const student = await studentModel.findById(id);
    if (!student) {
      res.flash('danger', 'Student not found.');
      return res.redirect(`/admin/students?q=${encodeURIComponent(q || '')}&page=${page || 1}`);
    }

    const newValue = available === '1';
    await userModel.setAvailability(id, newValue);

    res.flash('success', newValue ? 'Student account activated.' : 'Student account locked.');
    res.redirect(`/admin/students?q=${encodeURIComponent(q || '')}&page=${page || 1}`);
  } catch (err) {
    console.error('Error updating student availability:', err);
    res.flash('danger', 'Error updating account status.');
    res.redirect(`/admin/students?q=${encodeURIComponent(q || '')}&page=${page || 1}`);
  }
});

export default router;

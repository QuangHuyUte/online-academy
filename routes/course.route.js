import express from 'express';
import courseModel from '../models/course.model.js';
import categoryModel from '../models/category.model.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [featuredCourses, mostViewedCourses, newestCourses, topCategories, menu] = await Promise.all([
      courseModel.getFeaturedCourses(),
      courseModel.getMostViewedCourses(),
      courseModel.getNewestCourses(),
      courseModel.getTopCategories(),
      categoryModel.getMenuCategories()
    ]);

    res.render('vwHome/index', {
      featuredCourses,
      mostViewedCourses,
      newestCourses,
      topCategories,
      menu
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi khi tải trang chính');
  }
});

router.get('/list', async (req, res) => {
  const courses = await courseModel.all();
  res.render('vwCourses/list', { courses });
});

router.get('/category/:id', async (req, res) => {
  const categoryId = +req.params.id || 0;
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const offset = (page - 1) * limit;

  try {
    const [total, courses, menu] = await Promise.all([
      courseModel.countCoursesByCategory(categoryId),
      courseModel.getCoursesByCategory(categoryId, limit, offset),
      categoryModel.getMenuCategories()
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.render('course/list', {
      layout: 'main',
      courses,
      currentPage: page,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
      pageNumbers: Array.from({ length: totalPages }, (_, i) => ({ value: i + 1, isActive: i + 1 === page })),
      menu
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi khi tải danh sách khóa học');
  }
});

// Pagination for newest courses (page 1 is on home, pages >=2 served here)
router.get('/newest', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  if (page <= 1) return res.redirect('/');

  const limit = 6; // page >=2 shows 6 per page
  const offset = 4 + (page - 2) * limit; // skip first 4 shown on home

  try {
    const [total, courses, menu] = await Promise.all([
      courseModel.countNewestCourses(),
      courseModel.getNewestCourses(limit, offset),
      categoryModel.getMenuCategories()
    ]);

  const totalRemaining = Math.max(0, total - 4);
  const additionalPages = totalRemaining > 0 ? Math.ceil(totalRemaining / limit) : 0;
  const totalPages = 1 + additionalPages;

    // If requested page > totalPages, redirect to last
    if (page > totalPages) return res.redirect(`/courses/newest?page=${totalPages}`);

    const pageNumbers = Array.from({ length: totalPages }, (_, i) => ({ value: i + 1, isActive: i + 1 === page }));

    res.render('course/list', {
      layout: 'main',
      courses,
      empty: courses.length === 0,
      pageNumbers,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
      currentPage: page,
      totalPages,
      menu,
      title: 'Khóa học mới nhất'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi khi tải danh sách khóa học mới nhất');
  }
});

// Course detail
router.get('/:id', async (req, res) => {
  const id = +req.params.id || 0;
  try {
    const [course, menu] = await Promise.all([
      courseModel.getById(id),
      categoryModel.getMenuCategories()
    ]);

    if (!course) return res.status(404).render('404');

    res.render('course/detail', {
      layout: 'main',
      course,
      menu
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi khi tải chi tiết khóa học');
  }
});

export default router;


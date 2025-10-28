import express from 'express';
import courseModel from '../models/course.model.js';
import categoryModel from '../models/category.model.js';
import ratingModel from '../models/rating.model.js';
import watchlistModel from '../models/watchlist.model.js';
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
router.get('/details', async (req, res) => {
  const id = parseInt(req.query.id, 10);
  if (!id) return res.redirect('/courses');

  try {
    const course = await courseModel.findFullById(id);
    if (!course) return res.status(404).render('404');

    const outline = await courseModel.findOutlinePreview(id);
    const related = await courseModel.findTopByCategory(course.cat_id, id, 5);
    const reviews = await ratingModel.findByCourseId(id);

    let avgRating = 0;
    if (reviews.length > 0)
      avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

    course.rating_avg = avgRating.toFixed(1);
    course.rating_count = reviews.length;

    const user_id = req.session.authUser?.id || null;
    let inWatchlist = false;
    if (user_id) {
    inWatchlist = await watchlistModel.exists(user_id, id);
      };

    res.render('vwCourse/detail', {
      course,
      outline,
      related,
      reviews,
      inWatchlist,
      hasReviews: reviews.length > 0,
      outlineEmpty: outline.length === 0,
    });
  } catch (err) {
  console.error('❌ Lỗi khi tải chi tiết khóa học:', err);
  res.status(500).send('Không thể tải chi tiết khóa học.');
}
});
// ✅ Chi tiết khóa học: /course/:id/details
router.get('/:id/details', async (req, res) => {
  const id = +req.params.id || 0;
  try {
    const course = await courseModel.getById(id);
    if (!course) return res.status(404).render('404');

    const [menu, outline, related, reviews] = await Promise.all([
      categoryModel.getMenuCategories(),
      courseModel.findOutlinePreview(id),
      courseModel.findTopByCategory(course.cat_id, id, 5),
      ratingModel.findByCourseId(id)
    ]);

    let avgRating = 0;
    if (reviews.length > 0)
      avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

    course.rating_avg = avgRating.toFixed(1);
    course.rating_count = reviews.length;

    const user_id = req.session.authUser?.id;
    const inWatchlist = user_id ? await watchlistModel.exists(user_id, id) : false;

    res.render('vwCourse/detail', {
      layout: 'main',
      course,
      outline,
      related,
      reviews,
      menu,
      inWatchlist,
      hasReviews: reviews.length > 0,
      outlineEmpty: outline.length === 0,
    });
  } catch (err) {
    console.error('❌ Lỗi khi tải chi tiết khóa học:', err);
    res.status(500).send('Không thể tải chi tiết khóa học.');
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

/* ===============================
   🎓 PHẦN CỦA BẠN (Feature Detail + Watchlist + Review)
================================ */


router.post('/watchlist/add', async (req, res) => {
  try {
    const { course_id } = req.body;
    const user_id = req.session.authUser?.id;

    if (!user_id) {
      return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập để thêm yêu thích.' });
    }
    if (!course_id) {
      return res.status(400).json({ success: false, message: 'Thiếu ID khóa học.' });
    }

    // ✅ Kiểm tra xem đã tồn tại chưa
    const exists = await watchlistModel.exists(user_id, course_id);
    if (exists) {
      return res.json({ success: false, already: true, message: 'Khoá học này đã có trong danh sách yêu thích.' });
    }

    // ✅ Thêm mới
    await watchlistModel.addWatchlist(user_id, course_id);
    res.json({ success: true, message: 'Đã thêm vào danh sách yêu thích' });

  } catch (err) {
    console.error('❌ Watchlist add error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi thêm vào danh sách yêu thích.' });
  }
});


// 🔹 Xóa khỏi Watchlist
router.post('/watchlist/remove', async (req, res) => {
  try {
    const { course_id } = req.body;
    const user_id = req.session.authUser?.id;

    if (!user_id) {
      return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập để xoá yêu thích.' });
    }
    if (!course_id) {
      return res.status(400).json({ success: false, message: 'Thiếu ID khóa học.' });
    }

    const exists = await watchlistModel.exists(user_id, course_id);
    if (!exists) {
      return res.json({ success: false, notFound: true, message: 'Khoá học này chưa có trong danh sách yêu thích.' });
    }

    await watchlistModel.remove(user_id, course_id);
    res.json({ success: true, message: 'Đã xóa khỏi danh sách yêu thích' });

  } catch (err) {
    console.error('❌ Watchlist remove error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi xoá khỏi danh sách yêu thích.' });
  }
});


// 🔹 Gửi Feedback/Review
router.post('/reviews/add', async (req, res) => {
  const { course_id, rating, comment } = req.body;
  const user_id = req.session.userId || 1;

  try {
    const enrolled = await ratingModel.hasEnrolled(user_id, course_id);
    if (!enrolled)
      return res
        .status(403)
        .send('<h3 style="color:red;text-align:center;margin-top:50px;">Bạn cần đăng ký khóa học trước khi đánh giá.</h3>');

    const reviewed = await ratingModel.hasReviewed(user_id, course_id);
    if (reviewed)
      return res
        .status(400)
        .send('<h3 style="color:orange;text-align:center;margin-top:50px;">Bạn đã gửi đánh giá cho khóa học này rồi!</h3>');

    await ratingModel.addRating(course_id, user_id, rating, comment);
    res.redirect(`/courses/details?id=${course_id}`);
  } catch {
    res.status(500).send('Không thể gửi đánh giá.');
  }
});

export default router;


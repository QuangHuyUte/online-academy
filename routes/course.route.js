import express from 'express';
import courseModel from '../models/course.model.js';
import categoryModel from '../models/category.model.js';
import ratingModel from '../models/rating.model.js';
import watchlistModel from '../models/watchlist.model.js';
import db from "../utils/db.js";
import * as sectionModel from "../models/section.model.js";
import * as lessonModel from "../models/lesson.model.js";
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [featuredCourses, mostViewedCourses, newestCourses, topfield, menu] = await Promise.all([
      // đảm bảo Featured Course hiển thị 3 mục
      courseModel.getFeaturedCourses(3),
      courseModel.getMostViewedCourses(),
      courseModel.getNewestCourses(),
      // Lấy 5 lĩnh vực nổi bật trong tuần
      courseModel.getTopCategories(5),
      categoryModel.getMenuCategories()
    ]);

    res.render('vwHome/index', {
      featuredCourses,
      mostViewedCourses,
      newestCourses,
      topfield,
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
  const categoryId = Number(req.params.id) || 0;
  const page = Number(req.query.page) || 1;
  const limit = 3;
  const offset = (page - 1) * limit;
  const sort = String(req.query.sort || 'rating_desc'); //  rating_desc | rating_asc | price_desc | price_asc | newest

  const [totalResult, courses] = await Promise.all([
    courseModel.countCoursesByCategory(categoryId),
    courseModel.getCoursesByCategory(categoryId, limit, offset,sort),
  ]);

  const totalCount = Number(totalResult?.count || totalResult?.amount || 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  //  Base URL 
  const baseUrl = `/courses/category/${categoryId}?limit=${limit}&sort=${encodeURIComponent(sort)}`;
  //  Tạo object pagination đầy đủ
  const pagination = {
    page,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    prevUrl: `${baseUrl}&page=${Math.max(1, page - 1)}`,
    nextUrl: `${baseUrl}&page=${Math.min(totalPages, page + 1)}`,
    pages: Array.from({ length: totalPages }, (_, i) => {
      const p = i + 1;
      return {
        page: p,
        active: p === page,
        url: `${baseUrl}&page=${p}`,
      };
    }),
  };
  
  //  Render ra view
  res.render('course/list', {
    courses,
    pagination,
    sort,
  });

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

    // ✅ Kiểm tra xem user đã đăng ký học khóa này chưa
    let isEnrolled = false;
    if (user_id) {
      const enrolled = await db('enrollments')
        .where({ user_id, course_id: id })
        .first();
      if (enrolled) isEnrolled = true;
    }

    // ✅ Kiểm tra xem có trong watchlist không (đã có sẵn)
    let inWatchlist = false;
    if (user_id) {
      inWatchlist = await watchlistModel.exists(user_id, id);
    }

    res.render('vwCourse/detail', {
      course,
      outline,
      related,
      reviews,
      inWatchlist,
      isEnrolled, // ✅ truyền biến này sang view
      hasReviews: reviews.length > 0,
      outlineEmpty: outline.length === 0,
    });
  } catch (err) {
    console.error('❌ Lỗi khi tải chi tiết khóa học:', err);
    res.status(500).send('Không thể tải chi tiết khóa học.');
  }
});


router.post("/enroll/:id", async (req, res) => {
  if (!req.session.authUser) {
    // Nếu chưa đăng nhập, chuyển hướng tới login
    return res.redirect("/account/signin");
  }

  const userId = req.session.authUser.user_id ?? req.session.authUser.id;
  const courseId = req.params.id;

  try {
    // Kiểm tra xem đã đăng ký chưa
    const existing = await db("enrollments")
      .where({ user_id: userId, course_id: courseId })
      .first();

    if (!existing) {
      await db("enrollments").insert({
        user_id: userId,
        course_id: courseId,
        purchased_at: new Date(),
      });
    }

    // Dùng flash message báo thành công
    req.session.flash = { message: "Đăng ký khóa học thành công!" };
    res.redirect(`/courses/details?id=${courseId}`);
  } catch (err) {
    console.error("Enroll error:", err);
    req.session.flash = { message: "Lỗi khi đăng ký khóa học!" };
    res.redirect(`/courses/details?id=${courseId}`);
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

router.get("/learning/:id", async (req, res) => {
  const courseId = parseInt(req.params.id, 10);
  if (!req.session.authUser) {
    req.session.flash = { message: "Vui lòng đăng nhập để học." };
    return res.redirect(`/account/signin`);
  }

  try {
    const course = await courseModel.findFullById(courseId);
    const sections = await sectionModel.findByCourse(courseId);

    // Lấy toàn bộ bài học theo từng section
    for (const section of sections) {
      section.lessons = await lessonModel.findBySection(section.id);
    }

    res.render("vwCourse/learning", {
      layout: "main",
      course,
      sections,
    });
  } catch (err) {
    console.error("❌ Lỗi khi tải trang học:", err);
    res.status(500).send("Không thể tải trang học.");
  }
});

export default router;


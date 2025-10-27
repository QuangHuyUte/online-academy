import express from 'express';
import * as courseModel from '../models/course.model.js';
import * as ratingModel from '../models/rating.model.js';
import * as watchlistModel from '../models/watchlist.model.js';

const router = express.Router();

// 🔹 Chi tiết khóa học
router.get('/details', async (req, res) => {
  const id = parseInt(req.query.id, 10);
  if (!id) return res.redirect('/courses');

  try {
    const course = await courseModel.findFullById(id);
    if (!course) return res.status(404).render('404');

    const outline = await courseModel.findOutlinePreview(id);
    const related = await courseModel.findTopByCategory(course.cat_id, id, 5);
    const reviews = await ratingModel.findByCourseId(id);

    // Tính trung bình rating
    let avgRating = 0;
    if (reviews.length > 0)
      avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

    course.rating_avg = avgRating.toFixed(1);
    course.rating_count = reviews.length;

    // Kiểm tra có trong watchlist hay chưa
    const user_id = req.session.userId || 1;
    const inWatchlist = await watchlistModel.exists(user_id, id);

    res.render('vwCourse/detail', {
      course,
      outline,
      related,
      reviews,
      inWatchlist,
      hasReviews: reviews.length > 0,
      outlineEmpty: outline.length === 0
    });
  } catch {
    res.status(500).send('Không thể tải chi tiết khóa học.');
  }
});

// 🔹 Thêm vào Watchlist
router.post('/watchlist/add', async (req, res) => {
  try {
    const { course_id } = req.body;
    const user_id = req.session.userId || 1;
    if (!course_id) return res.status(400).json({ success: false });

    await watchlistModel.addWatchlist(user_id, course_id);
    res.json({ success: true, message: 'Đã thêm vào danh sách yêu thích' });
  } catch {
    res.status(500).json({ success: false });
  }
});

// 🔹 Xóa khỏi Watchlist
router.post('/watchlist/remove', async (req, res) => {
  try {
    const { course_id } = req.body;
    const user_id = req.session.userId || 1;
    if (!course_id) return res.status(400).json({ success: false });

    await watchlistModel.remove(user_id, course_id);
    res.json({ success: true, message: 'Đã xóa khỏi danh sách yêu thích' });
  } catch {
    res.status(500).json({ success: false });
  }
});

// 🔹 Gửi Feedback/Review
router.post('/reviews/add', async (req, res) => {
  const { course_id, rating, comment } = req.body;
  const user_id = req.session.userId || 1;

  try {
    const enrolled = await ratingModel.hasEnrolled(user_id, course_id);
    if (!enrolled)
      return res.status(403).send('<h3 style="color:red;text-align:center;margin-top:50px;">Bạn cần đăng ký khóa học trước khi đánh giá.</h3>');

    const reviewed = await ratingModel.hasReviewed(user_id, course_id);
    if (reviewed)
      return res.status(400).send('<h3 style="color:orange;text-align:center;margin-top:50px;">Bạn đã gửi đánh giá cho khóa học này rồi!</h3>');

    await ratingModel.addRating(course_id, user_id, rating, comment);
    res.redirect(`/courses/details?id=${course_id}`);
  } catch {
    res.status(500).send('Không thể gửi đánh giá.');
  }
});

export default router;

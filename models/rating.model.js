import db from '../utils/db.js';

// Lấy danh sách review của 1 khóa học
export async function findByCourseId(courseId) {
  return db('reviews as r')
    .join('users as u', 'u.id', 'r.user_id')
    .select('r.*', 'u.name as user_name')
    .where('r.course_id', courseId)
    .orderBy('r.created_at', 'desc');
}

// Thêm review mới
export async function addRating(courseId, userId, rating, comment) {
  return db('reviews').insert({
    course_id: courseId,
    user_id: userId,
    rating,
    comment
  });
}

// Kiểm tra user đã đăng ký khóa học chưa
export async function hasEnrolled(userId, courseId) {
  const row = await db('enrollments')
    .where({ user_id: userId, course_id: courseId })
    .first();
  return !!row;
}

// Kiểm tra user đã review chưa
export async function hasReviewed(userId, courseId) {
  const row = await db('reviews')
    .where({ user_id: userId, course_id: courseId })
    .first();
  return !!row;
}
export default {
  findByCourseId,
  addRating,
  hasEnrolled,
  hasReviewed
};
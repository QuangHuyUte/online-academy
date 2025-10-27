// models/rating.model.js
import db from '../utils/db.js';

export async function findByCourseId(courseId) {
  return db('reviews')
    .join('users', 'reviews.user_id', 'users.id')
    .where('reviews.course_id', courseId)
    .select(
      'users.name as user_name',
      'reviews.rating',
      'reviews.comment',
      'reviews.created_at'
    )
    .orderBy('reviews.created_at', 'desc');
}

// Thêm mới 1 review
export async function add(userId, courseId, rating, comment) {
  return db('reviews').insert({
    user_id: userId,
    course_id: courseId,
    rating,
    comment,
  });
}

// Kiểm tra user đã review chưa
export async function hasReviewed(userId, courseId) {
  const row = await db('reviews')
    .where({ user_id: userId, course_id: courseId })
    .first();
  return !!row;
}
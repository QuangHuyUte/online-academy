import db from '../utils/db.js';

// Thống kê: số review + điểm trung bình
export async function statByCourse(courseId) {
  const row = await db('reviews')
    .where('course_id', courseId)
    .count('* as count')
    .avg('rating as avg')
    .first();
  return {
    count: Number(row?.count || 0),
    avg: row?.avg ? Number(row.avg).toFixed(1) : 0
  };
}

// Danh sách review theo thời gian (mới nhất trước) + tên người dùng
export function findByCourse(courseId, limit = 20) {
  return db('reviews as r')
    .join('users as u','r.user_id','u.id')
    .select('r.id','r.rating','r.comment','r.created_at','u.name as user_name')
    .where('r.course_id', courseId)
    .orderBy('r.created_at','desc')
    .limit(limit);
}

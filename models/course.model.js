// models/course.model.js
import db from '../utils/db.js';

// Lấy toàn bộ khóa học (tuỳ bạn có muốn lọc removed hay không)
export function findAll({ excludeRemoved = false } = {}) {
  const q = db('courses').orderBy('id', 'desc');
  if (excludeRemoved) q.where('is_removed', false);
  return q;
}

// Tìm theo ID
export function findById(id) {
  return db('courses').where('id', id).first();
}

// Lấy theo giảng viên (đơn giản)
export function findByInstructor(instructorId, { excludeRemoved = false } = {}) {
  const q = db('courses')
    .where('instructor_id', instructorId)
    .orderBy('id', 'desc');
  if (excludeRemoved) q.andWhere('is_removed', false);
  return q;
}

// Phân trang theo giảng viên (dùng cho /instructor/my-courses)
export function findPageByInstructor(instructorId, offset, limit, { excludeRemoved = false } = {}) {
  const q = db('courses')
    .where('instructor_id', instructorId)
    .orderBy('last_updated_at', 'desc')
    .offset(offset)
    .limit(limit);
  if (excludeRemoved) q.andWhere('is_removed', false);
  return q;
}

export function countByInstructor(instructorId, { excludeRemoved = false } = {}) {
  const q = db('courses')
    .where('instructor_id', instructorId)
    .count('* as amount')
    .first();
  if (excludeRemoved) q.andWhere('is_removed', false);
  return q;
}

// Thêm mới
export function add(course) {
  return db('courses').insert(course).returning('id');
}

// Cập nhật
export function patch(id, course) {
  return db('courses').where('id', id).update(course);
}

// Admin: đánh dấu remove/restore (thay cho hidden)
export function setRemoved(id, removed = true) {
  return db('courses').where('id', id).update({ is_removed: removed });
}

// Admin: danh sách kèm join + search (có cột is_removed)
export function findPageAdmin(offset, limit, keyword = '') {
  let q = db('courses as c')
    .leftJoin('categories as cat', 'cat.id', 'c.cat_id')
    .leftJoin('instructors as i', 'i.id', 'c.instructor_id')
    .leftJoin('users as u', 'u.id', 'i.user_id')
    .select(
      'c.*',
      'cat.name as category',
      'u.name as instructor'
    )
    .orderBy('c.id', 'desc')
    .offset(offset)
    .limit(limit);

  if (keyword) {
    // Postgres: whereILike (Knex v2+) — nếu dùng MySQL, đổi sang where('c.title','like', `%${keyword}%`)
    q = q.whereILike('c.title', `%${keyword}%`);
  }
  return q;
}

// Instructor: đánh dấu hoàn thành
export function markCompleted(id) {
  return db('courses').where('id', id).update({ is_completed: true });
}

// Đếm theo category (để kiểm tra canDelete ở admin)
export function countByCat(catId) {
  return db('courses').where('cat_id', catId).count('id as amount').first();
}

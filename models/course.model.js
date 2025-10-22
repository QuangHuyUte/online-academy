import db from '../utils/db.js';

// Lấy toàn bộ khóa học
export function findAll() {
  return db('courses').orderBy('id', 'desc');
}

// Tìm khóa học theo ID
export function findById(id) {
  return db('courses').where('id', id).first();
}

// Lấy theo giảng viên
export function findByInstructor(instructorId) {
  return db('courses').where('instructor_id', instructorId).orderBy('id', 'desc');
}

// Thêm mới khóa học (Instructor)
export function add(course) {
  return db('courses').insert(course).returning('id');
}

// Cập nhật khóa học
export function patch(id, course) {
  return db('courses').where('id', id).update(course);
}

// Ẩn / hiện khóa học (Admin)
export function setHidden(id, hidden = true) {
  return db('courses').where('id', id).update({ is_hidden: hidden });
}

// Lấy danh sách cho Admin (có tìm kiếm)
export function findPageAdmin(offset, limit, keyword = '') {
  let query = db('courses as c')
    .leftJoin('categories as cat', 'cat.id', 'c.cat_id')
    .leftJoin('instructors as i', 'i.id', 'c.instructor_id')
    .leftJoin('users as u', 'u.id', 'i.user_id')
    .select('c.*', 'cat.name as category', 'u.name as instructor')
    .orderBy('c.id', 'desc')
    .offset(offset)
    .limit(limit);

  if (keyword) {
    query = query.whereILike('c.title', `%${keyword}%`);
  }

  return query;
}

// Đánh dấu hoàn thành khóa học
export function markCompleted(id) {
  return db('courses').where('id', id).update({ is_completed: true });
}

// Đếm số khóa học theo category
export function countByCat(catId) {
  return db('courses').where('cat_id', catId).count('id as amount').first();
}

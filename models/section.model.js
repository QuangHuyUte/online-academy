// models/section.model.js
import db from '../utils/db.js';

/* ========== BASIC FINDERS ========== */
export function findById(id) {
  return db('sections').where({ id }).first();
}

/**
 * Danh sách section theo course, sắp xếp order_no rồi id.
 * Trả về đủ cột (id, course_id, title, order_no) để dùng trong UI quản trị nội dung.
 */
export function findByCourse(courseId) {
  return db('sections')
    .where({ course_id: courseId })
    .orderBy([
      { column: 'order_no', order: 'asc' },
      { column: 'id',       order: 'asc' },
    ]);
}

/**
 * (Tùy chọn) Bản rút gọn – tương thích code cũ ở nhánh main,
 * chỉ lấy vài trường cơ bản khi render outline đơn giản.
 */
export function findByCourseLite(course_id) {
  return db('sections')
    .where({ course_id })
    .select('id', 'title')
    .orderBy([
      { column: 'order_no', order: 'asc' },
      { column: 'id',       order: 'asc' },
    ]);
}

/* ========== COUNTS ========== */
export function countByCourse(courseId) {
  return db('sections').where({ course_id: courseId }).count('* as amount').first();
}

/* ========== CRUD ========== */
export function add(section) {
  // section: { course_id, title, order_no }
  return db('sections').insert(section).returning('id'); // [{ id }]
}

export function patch(id, section) {
  return db('sections').where({ id }).update(section);
}

export function remove(id) {
  return db('sections').where({ id }).del();
}

/* ========== SAFE REMOVE ========== */
/** Xoá an toàn: chỉ xoá khi KHÔNG có lesson */
export async function safeRemove(id) {
  const { amount } = await db('lessons')
    .where({ section_id: id })
    .count('* as amount')
    .first();

  if (Number(amount) > 0) return { ok: false, reason: 'HAS_LESSON' };

  const affected = await remove(id);
  return { ok: affected > 0, affected };
}

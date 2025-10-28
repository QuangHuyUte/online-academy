// models/lesson.model.js
import db from '../utils/db.js';

/* ========== BASIC FINDERS ========== */
export function findById(id) {
  return db('lessons').where({ id }).first();
}

/**
 * Danh sách bài theo section, sắp xếp order_no rồi id.
 * Trả về đầy đủ cột để dùng cho UI chỉnh sửa (title, video_url, duration_sec, is_preview, order_no, ...)
 */
export function findBySection(sectionId) {
  return db('lessons')
    .where({ section_id: sectionId })
    .orderBy([
      { column: 'order_no', order: 'asc' },
      { column: 'id',       order: 'asc' },
    ]);
}

/**
 * (Tùy chọn) Bản rút gọn – tương thích với code cũ ở nhánh main
 * chỉ lấy một vài trường khi render outline đơn giản.
 */
export function findBySectionLite(section_id) {
  return db('lessons')
    .where({ section_id })
    .select('id', 'title', 'video_url')
    .orderBy([
      { column: 'order_no', order: 'asc' },
      { column: 'id',       order: 'asc' },
    ]);
}

/* ========== COUNTS ========== */
export function countBySection(sectionId) {
  return db('lessons').where({ section_id: sectionId }).count('* as amount').first();
}

export function countByCourse(courseId) {
  return db('lessons as l')
    .join('sections as s', 's.id', 'l.section_id')
    .where('s.course_id', courseId)
    .count('* as amount')
    .first();
}

/* ========== CRUD ========== */
export function add(lesson) {
  // lesson: { section_id, title, video_url, duration_sec, is_preview, order_no }
  // Postgres: returning([{ id }])
  return db('lessons').insert(lesson).returning('id');
}

export function patch(id, lesson) {
  return db('lessons').where({ id }).update(lesson);
}

export function remove(id) {
  return db('lessons').where({ id }).del();
}

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
    .select('id', 'title', 'video_url', 'duration')
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

export async function findBySectionAndOrder(section_id, order_no) {
  return db('lessons').where({ section_id, order_no }).first();
}

/** Lấy order_no kế tiếp của 1 section (max + 1) */
export async function nextOrderNo(section_id) {
  const row = await db('lessons')
    .where({ section_id })
    .max('order_no as max')
    .first();
  const max = Number(row?.max || 0);
  return (isNaN(max) ? 0 : max) + 1;
}

/** Thêm lesson, tự tính order_no */
export async function addAutoOrder(payload) {
  const order_no = await nextOrderNo(payload.section_id);
  const row = { ...payload, order_no };
  const [id] = await db('lessons').insert(row).returning('id');
  return id?.id ?? id; // tuỳ phiên bản pg/knex
}

/** Cập nhật lesson nhưng bỏ qua order_no (không cho chỉnh) */
export async function patchNoOrder(id, patch) {
  const { order_no, ...rest } = patch; // loại bỏ order_no nếu có
  return db('lessons').where({ id }).update(rest);
}
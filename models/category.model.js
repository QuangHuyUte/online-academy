// models/category.model.js
import db from '../utils/db.js';

/** Lấy toàn bộ category, sắp xếp để render dạng cây 2 cấp */
export function findAll() {
  return db('categories').orderBy([
    { column: 'parent_id', order: 'asc' },
    { column: 'id',        order: 'asc' },
  ]);
}

export function findAllWithParent() {
  return db('categories as c')
    .leftJoin('categories as p', 'p.id', 'c.parent_id')
    .select('c.*', 'p.name as parent_name')
    .orderBy([
      { column: 'c.parent_id', order: 'asc' },
      { column: 'c.id',        order: 'asc' },
    ]);
}

export function findById(id) {
  return db('categories').where('id', id).first();
}

export function findByParent(parentId) {
  if (parentId === null) return db('categories').whereNull('parent_id');
  return db('categories').where('parent_id', parentId);
}

export function add(category) {
  // Trả về [{ id }] (Knex + Postgres)
  return db('categories').insert(category).returning('id');
}

export function patch(id, category) {
  // Nếu có cột updated_at thì bật dòng dưới:
  // category.updated_at = db.fn.now();
  return db('categories').where('id', id).update(category);
}

/** XÓA THÔNG THƯỜNG (không khuyến nghị dùng trực tiếp ở route) */
export function remove(id) {
  return db('categories').where('id', id).del();
}

/** Đếm số course đang gán vào category này */
export function countCourses(id) {
  return db('courses').where('cat_id', id).count('cat_id as amount').first();
}

/** Đếm số category con của category này */
export function countChildren(id) {
  return db('categories').where('parent_id', id).count('id as amount').first();
}

/** Chỉ cho xóa nếu KHÔNG có course và KHÔNG có category con */
export async function canDelete(id) {
  const [{ amount: c1 }, { amount: c2 }] = await Promise.all([
    countCourses(id),
    countChildren(id),
  ]);
  return Number(c1) === 0 && Number(c2) === 0;
}

/**
 * XÓA AN TOÀN: kiểm tra business rule rồi mới xóa
 * @returns {Promise<{ok: boolean, affected?: number, reason?: 'HAS_COURSE_OR_CHILD' | 'NOT_FOUND'}>}
 */
export async function safeRemove(id) {
  const ok = await canDelete(id);
  if (!ok) return { ok: false, reason: 'HAS_COURSE_OR_CHILD' };

  const affected = await remove(id);
  if (!affected) return { ok: false, reason: 'NOT_FOUND' };

  return { ok: true, affected };
}

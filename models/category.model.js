// models/category.model.js
import db from '../utils/db.js';

/* =========================
 *  Core finders / CRUD
 * ========================= */

// Lấy toàn bộ category (dễ render 2 cấp)
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

/** Nếu parentId === null ⇒ whereNull('parent_id') */
export function findByParent(parentId) {
  if (parentId === null) return db('categories').whereNull('parent_id');
  return db('categories').where('parent_id', parentId);
}

export function add(category) {
  // Knex + Postgres trả về [{ id }]
  return db('categories').insert(category).returning('id');
}

export function patch(id, category) {
  // nếu có cột updated_at: category.updated_at = db.fn.now();
  return db('categories').where('id', id).update(category);
}

/** XÓA THÔNG THƯỜNG (tránh dùng trực tiếp ở route admin) */
export function remove(id) {
  return db('categories').where('id', id).del();
}

/* =========================
 *  Counters & Safe Delete
 * ========================= */

/** Đếm số course còn hiệu lực (loại is_removed = true) trong 1 category */
export function countCourses(id) {
  return db('courses')
    .where({ cat_id: id })
    .andWhere(builder =>
      builder.whereNull('is_removed').orWhere('is_removed', false)
    )
    .count('cat_id as amount')
    .first();
}

export function countChildren(id) {
  return db('categories').where('parent_id', id).count('id as amount').first();
}

export async function canDelete(id) {
  const [{ amount: c1 }, { amount: c2 }] = await Promise.all([
    countCourses(id),
    countChildren(id),
  ]);
  return Number(c1) === 0 && Number(c2) === 0;
}

/**
 * XÓA AN TOÀN: chỉ xóa khi không có course và không có category con
 * @returns {Promise<{ok: boolean, affected?: number, reason?: 'HAS_COURSE_OR_CHILD' | 'NOT_FOUND'}>}
 */
export async function safeRemove(id) {
  const ok = await canDelete(id);
  if (!ok) return { ok: false, reason: 'HAS_COURSE_OR_CHILD' };

  const affected = await remove(id);
  if (!affected) return { ok: false, reason: 'NOT_FOUND' };
  return { ok: true, affected };
}

/* =========================
 *  Helpers (compat với nhánh main)
 * ========================= */

export function findCategoriesParent() {
  return db('categories').whereNull('parent_id');
}

export function findCategoriesByParentId(parentId) {
  return db('categories').where('parent_id', parentId);
}

export function findCoursesByCategoryId(categoryId) {
  return db('courses').where('cat_id', categoryId);
}

export function findCategoryNotParent() {
  return db('categories').whereNotNull('parent_id');
}

export function findAllCourse() {
  return db('courses');
}

/**
 * Top categories theo số enroll trong tuần hiện tại
 * Trả về: [{ id, name, enroll_count }]
 * (giữ nguyên hành vi cũ: count theo số dòng enrollments)
 */
export function getTopCategories(limit = 5) {
  return db('categories as c')
    .join('courses as co', 'c.id', 'co.cat_id')
    .join('enrollments as e', 'co.id', 'e.course_id')
    .select('c.id', 'c.name')
    .count({ enroll_count: 'e.course_id' })
    .whereRaw("date_trunc('week', e.purchased_at) = date_trunc('week', now())")
    .groupBy('c.id', 'c.name')
    .orderBy('enroll_count', 'desc')
    .limit(limit)
    .then(rows =>
      rows.map(r => ({
        id: r.id,
        name: r.name,
        enroll_count: Number(r.enroll_count),
      })),
    );
}

/**
 * Build menu 2 cấp: [{ id, name, children: [...] }]
 */
export async function getMenuCategories() {
  const [parents, children] = await Promise.all([
    findCategoriesParent(),
    findCategoryNotParent(),
  ]);

  const result = parents.map(p => ({ ...p, children: [] }));
  const byId = new Map(result.map(p => [p.id, p]));

  for (const c of children) {
    const parent = byId.get(c.parent_id);
    if (parent) parent.children.push(c);
  }
  return result;
}

/* =========================
 *  Default export (compat)
 * ========================= */

export default {
  // core
  findAll,
  findAllWithParent,
  findById,
  findByParent,
  add,
  patch,
  remove,
  // safe delete
  countCourses,
  countChildren,
  canDelete,
  safeRemove,
  // extras/compat
  findCategoriesParent,
  findCategoriesByParentId,
  findCoursesByCategoryId,
  findCategoryNotParent,
  findAllCourse,
  getTopCategories,
  getMenuCategories,
};

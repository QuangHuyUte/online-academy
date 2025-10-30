// models/user.model.js
import db from '../utils/db.js';

/* ===================== BASIC FINDERS ===================== */
export function findById(id) {
  return db('users').where('id', id).first();
}

/** Tìm email không phân biệt hoa/thường (phù hợp UNIQUE lower(email)) */
export function findByEmail(email) {
  return db('users').whereRaw('lower(email) = lower(?)', [email]).first();
}

/** (Compat) Trả hash theo name – chỉ dùng nếu nơi khác đang gọi */
export function getpasswordHash(name) {
  return db('users').where('name', name).select('password_hash').first();
}

export function listAll() {
  return db('users').orderBy('id', 'asc');
}

export function listByRole(role) {
  return db('users').where('role', role).orderBy('id', 'asc');
}

/* ========================= CRUD ========================= */
export async function add(user) {
  const [row] = await db('users').insert(user).returning('id');
  return typeof row === 'object' ? row.id : row;
}

export function setAvailability(userId, available) {
  const safeValue = available === true || available === 1 || available === '1';
  return db('users').where('id', userId).update({ is_available: safeValue });
}


export async function getAvailability(userId) {
  const row = await db('users').where('id', userId).select('is_available').first();
  return !!row?.is_available;
}

export function patch(id, user) {
  // LƯU Ý: Ở route nên whitelist field (name, avatar_url, email...) để tránh sửa role/password ngoài ý muốn
  return db('users').where('id', id).update(user);
}

export function remove(id) {
  // Cẩn thận: schema có nhiều ON DELETE CASCADE (instructors, enrollments, reviews, watchlist, progress)
  return db('users').where('id', id).del();
}

/* ================== SEARCH + PAGINATION ================== */
export function findPage(offset, limit, q = '', role = null) {
  const query = db('users').orderBy('id', 'asc').offset(offset).limit(limit);
  if (role) query.where('role', role);
  if (q) {
    query.andWhere(function () {
      this.whereILike('name', `%${q}%`).orWhereILike('email', `%${q}%`);
    });
  }
  return query;
}

export function countAll(q = '', role = null) {
  const query = db('users').count('* as amount').first();
  if (role) query.where('role', role);
  if (q) {
    query.andWhere(function () {
      this.whereILike('name', `%${q}%`).orWhereILike('email', `%${q}%`);
    });
  }
  return query;
}

/* ===================== SAFE REMOVE ====================== */
/**
 * Xoá an toàn:
 * - Không xoá admin cuối cùng.
 * - Nếu là instructor còn đang phụ trách khoá học → chặn xoá.
 */
export async function safeRemove(id) {
  const me = await findById(id);
  if (!me) return { ok: false, reason: 'NOT_FOUND' };

  if (me.role === 'admin') {
    const { amount } = await db('users').where('role', 'admin').count('* as amount').first();
    if (Number(amount) <= 1) return { ok: false, reason: 'LAST_ADMIN' };
  }

  if (me.role === 'instructor') {
    const row = await db('instructors as i')
      .leftJoin('courses as c', 'c.instructor_id', 'i.id')
      .where('i.user_id', id)
      .count('c.id as cnt')
      .first();
    if (row && Number(row.cnt) > 0) return { ok: false, reason: 'INSTRUCTOR_HAS_COURSES' };
  }

  const affected = await remove(id);
  return { ok: affected > 0, affected };
}

/* ================== COMPAT DEFAULT EXPORT ================== */
/** Giữ default export cho những nơi import kiểu `import userModel from ...` */
const userModel = {
  // API cũ
  findByEmail,                 // dùng bản không phân biệt hoa/thường
  add,                         // trả [{ id }]
  getAllUsers: listAll,        // alias
  findById,
  getpasswordHash,
  patch,
  // API mới hữu ích cho admin
  setAvailability,
  getAvailability,
  listAll,
  listByRole,
  findPage,
  countAll,
  remove,
  safeRemove,
};

export default userModel;

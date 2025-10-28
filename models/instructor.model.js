import db from '../utils/db.js';

// ---- basic finders ----
export function findById(id) {
  return db('instructors').where('id', id).first();
}

export function findByUserId(userId) {
  return db('instructors').where('user_id', userId).first();
}

export function findByEmail(email) {
  return db('instructors as i')
    .join('users as u', 'u.id', 'i.user_id')
    .select('i.*', 'u.name', 'u.email')
    .whereRaw('lower(u.email) = lower(?)', [email])
    .first();
}

// ---- list & search (for Admin) ----
export function findAll() {
  return db('instructors as i')
    .join('users as u', 'u.id', 'i.user_id')
    .select('i.*', 'u.name', 'u.email')
    .orderBy('i.id', 'asc');
}

export function findPage(offset, limit, keyword = '') {
  const q = db('instructors as i')
    .join('users as u', 'u.id', 'i.user_id')
    .select('i.*', 'u.name', 'u.email')
    .orderBy('i.id', 'asc')
    .offset(offset)
    .limit(limit);
  if (keyword) q.whereILike('u.name', `%${keyword}%`).orWhereILike('u.email', `%${keyword}%`);
  return q;
}

export function countAll(keyword = '') {
  const q = db('instructors as i')
    .join('users as u', 'u.id', 'i.user_id')
    .count('* as amount')
    .first();
  if (keyword) q.whereILike('u.name', `%${keyword}%`).orWhereILike('u.email', `%${keyword}%`);
  return q;
}

// ---- CRUD ----
export function add(instructor) {
  return db('instructors').insert(instructor).returning('id'); // [{id}]
}

export function patch(id, instructor) {
  return db('instructors').where('id', id).update(instructor);
}

// ---- delete safety ----
export function countCourses(instructorId) {
  return db('courses').where('instructor_id', instructorId).count('* as amount').first();
}

export async function canDelete(id) {
  const { amount } = await countCourses(id);
  return Number(amount) === 0;
}

export async function safeRemove(id) {
  const ok = await canDelete(id);
  if (!ok) return { ok: false, reason: 'HAS_COURSE' };
  const affected = await db('instructors').where('id', id).del();
  return { ok: affected > 0, affected };
}

// ---- courses of an instructor ----
export function findCourses(instructorId, { excludeRemoved = false } = {}) {
  const q = db('courses')
    .where('instructor_id', instructorId)
    .orderBy('last_updated_at', 'desc');
  if (excludeRemoved) q.andWhere('is_removed', false);
  return q;
}

export function findCoursesPage(instructorId, offset, limit, { excludeRemoved = false } = {}) {
  const q = db('courses')
    .where('instructor_id', instructorId)
    .orderBy('last_updated_at', 'desc')
    .offset(offset)
    .limit(limit);
  if (excludeRemoved) q.andWhere('is_removed', false);
  return q;
}

// ---- helpers (thuần) ----
const isYouTubeUrl = (u = '') =>
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/i.test(u);

export function isValidVideoUrl(u = '') {
  if (!u) return false;
  return u.startsWith('/uploads/') || isYouTubeUrl(u);
}

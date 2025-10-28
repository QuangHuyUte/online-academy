// models/course.model.js
import db from '../utils/db.js';

// ----- COMMON -----
export function findAll({ excludeRemoved = false } = {}) {
  const q = db('courses').orderBy('id', 'desc');
  if (excludeRemoved) q.where('is_removed', false);
  return q;
}

export function findById(id) {
  return db('courses').where('id', id).first();
}

export function add(course) {
  return db('courses').insert(course).returning('id');
}

export function patch(id, course) {
  return db('courses')
    .where('id', id)
    .update({ ...course, last_updated_at: db.fn.now() });
}

// ----- INSTRUCTOR -----
export function findByInstructor(instructorId, { excludeRemoved = false } = {}) {
  const q = db('courses')
    .where('instructor_id', instructorId)
    .orderBy('id', 'desc');
  if (excludeRemoved) q.andWhere('is_removed', false);
  return q;
}

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

export async function canComplete(courseId) {
  const { rows: r1 } = await db.raw(
    'SELECT EXISTS (SELECT 1 FROM sections WHERE course_id = ?) AS exists_section',
    [courseId]
  );
  const { rows: r2 } = await db.raw(
    `SELECT EXISTS (
        SELECT 1 FROM lessons 
        WHERE section_id IN (SELECT id FROM sections WHERE course_id = ?)
      ) AS exists_lesson`,
    [courseId]
  );

  const exists_section = r1?.[0]?.exists_section;
  const exists_lesson = r2?.[0]?.exists_lesson;
  return Boolean(exists_section && exists_lesson);
}


export function markCompleted(id) {
  return db('courses')
    .where('id', id)
    .update({ is_completed: true, last_updated_at: db.fn.now() });
}

// ----- ADMIN -----
export function setRemoved(id, removed = true) {
  return db('courses')
    .where('id', id)
    .update({ is_removed: removed, last_updated_at: db.fn.now() });
}

export function findPageAdmin(offset, limit, keyword = '', { showRemoved = true } = {}) {
  let q = db('courses as c')
    .leftJoin('categories as cat', 'cat.id', 'c.cat_id')
    .leftJoin('instructors as i', 'i.id', 'c.instructor_id')
    .leftJoin('users as u', 'u.id', 'i.user_id')
    .select(
      'c.id', 'c.title', 'c.price', 'c.promo_price',
      'c.is_completed', 'c.is_removed',
      'c.view_count', 
      'c.last_updated_at', 'cat.name as category', 'u.name as instructor'
    )
    .orderBy('c.last_updated_at', 'desc')
    .offset(offset)
    .limit(limit);

  if (keyword) q.whereILike('c.title', `%${keyword}%`);
  if (!showRemoved) q.andWhere('c.is_removed', false);
  return q;
}

export function countAdmin(keyword = '') {
  const q = db('courses as c').count('* as amount').first();
  if (keyword) q.whereILike('c.title', `%${keyword}%`);
  return q;
}

// ----- UTIL -----
export function countByCat(catId) {
  return db('courses')
    .where('cat_id', catId)
    .count('id as amount')
    .first();
}

import db from '../utils/db.js';

export function findById(id) {
  return db('sections').where({ id }).first();
}

export function findByCourse(courseId) {
  return db('sections')
    .where({ course_id: courseId })
    .orderBy([{ column: 'order_no', order: 'asc' }, { column: 'id', order: 'asc' }]);
}

export function countByCourse(courseId) {
  return db('sections').where({ course_id: courseId }).count('* as amount').first();
}

export function add(section) {
  // section: { course_id, title, order_no }
  return db('sections').insert(section).returning('id'); // [{id}]
}

export function patch(id, section) {
  return db('sections').where({ id }).update(section);
}

export function remove(id) {
  return db('sections').where({ id }).del();
}

/** Xoá an toàn: chỉ xoá khi KHÔNG có lesson */
export async function safeRemove(id) {
  const { amount } = await db('lessons').where({ section_id: id }).count('* as amount').first();
  if (Number(amount) > 0) return { ok: false, reason: 'HAS_LESSON' };
  const affected = await remove(id);
  return { ok: affected > 0, affected };
}

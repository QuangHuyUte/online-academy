// models/lesson.model.js
import db from '../utils/db.js';

export function findById(id) {
  return db('lessons').where({ id }).first();
}

export function findBySection(sectionId) {
  return db('lessons')
    .where({ section_id: sectionId })
    .orderBy([{ column: 'order_no', order: 'asc' }, { column: 'id', order: 'asc' }]);
}

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

export function add(lesson) {
  // lesson: { section_id, title, video_url, duration_sec, is_preview, order_no }
  return db('lessons').insert(lesson).returning('id'); // [{id}]
}

export function patch(id, lesson) {
  return db('lessons').where({ id }).update(lesson);
}

export function remove(id) {
  return db('lessons').where({ id }).del();
}

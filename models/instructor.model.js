import db from '../utils/db.js';

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
    .where('u.email', email)
    .first();
}

export function findAll() {
  return db('instructors as i')
    .join('users as u', 'u.id', 'i.user_id')
    .select('i.*', 'u.name', 'u.email')
    .orderBy('i.id');
}

export function add(instructor) {
  return db('instructors').insert(instructor).returning('id');
}

export function patch(id, instructor) {
  return db('instructors').where('id', id).update(instructor);
}

export function remove(id) {
  return db('instructors').where('id', id).del();
}

export function findCourses(instructorId) {
  return db('courses').where('instructor_id', instructorId).orderBy('id', 'desc');
}

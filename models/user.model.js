import db from '../utils/db.js';

export function findById(id) {
  return db('users').where('id', id).first();
}

export function findByEmail(email) {
  return db('users').where('email', email).first();
}

export function listAll() {
  return db('users').orderBy('id');
}

export function listByRole(role) {
  return db('users').where('role', role).orderBy('id');
}

export function add(user) {
  return db('users').insert(user).returning('id');
}

export function patch(id, user) {
  return db('users').where('id', id).update(user);
}

export function remove(id) {
  return db('users').where('id', id).del();
}

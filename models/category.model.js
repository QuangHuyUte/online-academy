import db from '../utils/db.js';

export function findAll() {
  return db('categories').orderBy('id');
}

export function findById(id) {
  return db('categories').where('id', id).first();
}

export function findByParent(parentId) {
  if (parentId === null)
    return db('categories').whereNull('parent_id');
  return db('categories').where('parent_id', parentId);
}

export function add(category) {
  return db('categories').insert(category).returning('id');
}

export async function patch(id, category) {
  return db('categories').where('id', id).update(category);
}

export async function remove(id) {
  return db('categories').where('id', id).del();
}

export function countCourses(id) {
  return db('courses')
    .where('cat_id', id)
    .count('cat_id as amount')
    .first();
}

export async function canDelete(id) {
  const { amount } = await countCourses(id);
  return Number(amount) === 0;
}

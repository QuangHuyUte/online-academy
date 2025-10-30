import db from '../utils/db.js';

export function findPage(offset, limit, keyword = '') {
  const q = db('users')
    .select('id', 'name', 'email', 'created_at', 'is_available')
    .where('role', 'student')
    .orderBy('id', 'asc')
    .offset(offset)
    .limit(limit);

  if (keyword) {
    q.andWhere((b) =>
      b.whereILike('name', `%${keyword}%`)
       .orWhereILike('email', `%${keyword}%`)
    );
  }

  return q;
}

export function count(keyword = '') {
  const q = db('users')
    .where('role', 'student')
    .count('* as amount')
    .first();

  if (keyword) {
    q.andWhere((b) =>
      b.whereILike('name', `%${keyword}%`)
       .orWhereILike('email', `%${keyword}%`)
    );
  }

  return q;
}

export function findById(id) {
  return db('users')
    .select('id', 'name', 'email', 'created_at', 'is_available')
    .where({ id, role: 'student' })
    .first();
}

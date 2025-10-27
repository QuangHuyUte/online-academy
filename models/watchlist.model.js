import db from '../utils/db.js';

export async function addWatchlist(userId, courseId) {
  
  return db('watchlist').insert({
    user_id: userId,
    course_id: courseId
  });
}

export async function remove(userId, courseId) {
  return db('watchlist')
    .where({ user_id: userId, course_id: courseId })
    .del();
}

export async function exists(userId, courseId) {
  const row = await db('watchlist')
    .where({ user_id: userId, course_id: courseId })
    .first();
  return !!row;
}

export async function findAllByUser(userId) {
  return db('watchlist as w')
    .join('courses as c', 'w.course_id', 'c.id')
    .select(
      'c.id',
      'c.title',
      'c.cover_url',
      'c.promo_price',
      'c.price',
      'c.rating_avg',
      'c.rating_count'
    )
    .where('w.user_id', userId);
}

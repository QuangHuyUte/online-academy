import db from '../utils/db.js';

export async function isEnrolled(userId, courseId) {
  const row = await db('enrollments')
    .where({ user_id: userId, course_id: courseId })
    .first();
  return !!row;
}

import db from '../utils/db.js';

export async function findFullById(id) {
  return db('courses as c')
    .leftJoin('instructors as i', 'i.id', 'c.instructor_id')
    .leftJoin('categories as cat', 'cat.id', 'c.cat_id')
    .select(
      'c.*',
      'i.id as instructor_id',
      'i.bio as instructor_bio',
      'i.avatar_url as instructor_avatar',
      'cat.name as category_name',
      db.raw('(SELECT name FROM users WHERE id = i.user_id) as instructor_name')
    )
    .where('c.id', id)
    .first();
}

export async function findOutlinePreview(courseId) {
  const rows = await db('sections as s')
    .leftJoin('lessons as l', 's.id', 'l.section_id')
    .select(
      's.id as section_id',
      's.title as section_title',
      's.order_no as section_order',
      'l.id as lesson_id',
      'l.title as lesson_title',
      'l.video_url',
      'l.duration_sec',
      'l.is_preview',
      'l.order_no as lesson_order'
    )
    .where('s.course_id', courseId)
    // ✅ chỉ lấy bài có preview TRUE hoặc vẫn hiển thị section trống
    .andWhere(function () {
      this.where('l.is_preview', true).orWhereNull('l.id');
    })
    .orderBy('s.order_no', 'asc')
    .orderBy('l.order_no', 'asc');

  // Gom bài học theo section
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.section_id)) {
      map.set(r.section_id, {
        id: r.section_id,
        title: r.section_title,
        order_no: r.section_order,
        lessons: []
      });
    }
    if (r.lesson_id) {
      map.get(r.section_id).lessons.push({
        id: r.lesson_id,
        title: r.lesson_title,
        video_url: r.video_url,
        duration_sec: r.duration_sec,
        is_preview: r.is_preview,
        order_no: r.lesson_order
      });
    }
  }
  return Array.from(map.values());
}
export async function findTopByCategory(catId, excludeId, limit = 5) {
  return db('courses')
    .where('cat_id', catId)
    .andWhere('is_removed', false)
    .andWhereNot('id', excludeId)
    .orderBy('students_count', 'desc')
    .limit(limit);
}

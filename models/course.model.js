// models/course.model.js
import db from '../utils/db.js';

/* =========================================
 * COMMON (CRUD cơ bản cho courses)
 * ========================================= */

export function findAll({ excludeRemoved = false } = {}) {
  const q = db('courses').orderBy('id', 'desc');
  if (excludeRemoved) q.where('is_removed', false);
  return q;
}

export function findById(id) {
  return db('courses').where('id', id).first();
}

export function add(course) {
  // Postgres: trả về [{ id }]
  return db('courses').insert(course).returning('id');
}

export function patch(id, course) {
  return db('courses')
    .where('id', id)
    .update({ ...course, last_updated_at: db.fn.now() });
}

/* =========================================
 * INSTRUCTOR (liệt kê, đếm, hoàn thành)
 * ========================================= */

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
  const exists_lesson  = r2?.[0]?.exists_lesson;
  return Boolean(exists_section && exists_lesson);
}

export function markCompleted(id) {
  return db('courses')
    .where('id', id)
    .update({ is_completed: true, last_updated_at: db.fn.now() });
}

/* =========================================
 * ADMIN (toggle remove, paging admin)
 * ========================================= */

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
      'c.id', 'c.title',
      'c.price', 'c.promo_price',
      'c.is_completed', 'c.is_removed',
      'c.view_count',            // nếu DB bạn đã thêm cột này
      'c.last_updated_at',
      'cat.name as category',
      'u.name as instructor'
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

/* =========================================
 * UTIL
 * ========================================= */

export function countByCat(catId) {
  return db('courses')
    .where('cat_id', catId)
    .count('id as amount')
    .first();
}

// alias cho tương thích với code cũ
export const countByCategory = countByCat;

/* =========================================
 * FUNCS từ nhánh main (chi tiết/preview/home feed)
 * ========================================= */

// — Chi tiết full (join instructor + category + user.name)
export function findFullById(id) {
  return db('courses as c')
    .leftJoin('instructors as i', 'i.id', 'c.instructor_id')
    .leftJoin('categories as cat', 'cat.id', 'c.cat_id')
    .select(
      'c.*',
      'i.id as instructor_id',
      'i.bio as instructor_bio',
      'i.avatar_url as instructor_avatar',
      'cat.id as cat_id',
      'cat.name as category_name',
      db.raw('(SELECT name FROM users WHERE id = i.user_id) as instructor_name')
    )
    .where('c.id', id)
    .first();
}

// — Đề cương preview (gom section + lesson có is_preview = true)
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
    .andWhere(function () {
      this.where('l.is_preview', true).orWhereNull('l.id');
    })
    .orderBy('s.order_no', 'asc')
    .orderBy('l.order_no', 'asc');

  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.section_id)) {
      map.set(r.section_id, {
        id: r.section_id,
        title: r.section_title,
        order_no: r.section_order,
        lessons: [],
      });
    }
    if (r.lesson_id) {
      map.get(r.section_id).lessons.push({
        id: r.lesson_id,
        title: r.lesson_title,
        video_url: r.video_url,
        duration_sec: r.duration_sec,
        is_preview: r.is_preview,
        order_no: r.lesson_order,
      });
    }
  }
  return Array.from(map.values());
}

// — 5 khoá cùng category bán chạy (trừ chính nó)
export function findTopByCategory(catId, excludeId, limit = 5) {
  return db('courses')
    .where('cat_id', catId)
    .andWhere('is_removed', false)
    .andWhereNot('id', excludeId)
    .orderBy('students_count', 'desc')
    .limit(limit);
}

/* ========== Home / Listing feeds, search, thống kê ========== */

// Featured tuần (dựa vào enrollments trong tuần)
export function getFeaturedCourses(limit = 4) {
  return db('courses as c')
    .join('enrollments as e', 'c.id', 'e.course_id')
    .leftJoin('categories as cat', 'c.cat_id', 'cat.id')
    .leftJoin('instructors as ins', 'c.instructor_id', 'ins.id')
    .leftJoin('users as u', 'ins.user_id', 'u.id')
    .select(
      'c.id',
      'c.title',
      'c.short_desc as shortDesc',
      'c.cover_url as image',
      db.raw("coalesce(cat.name, 'Uncategorized') as category_name"),
      db.raw("coalesce(u.name, 'Giảng viên chưa rõ') as teacher_name"),
      db.raw('coalesce(c.price, 0) as price'),
      db.raw('coalesce(c.promo_price, 0) as promo_price')
    )
    .count({ enroll_count: 'e.course_id' })
    .whereRaw("date_trunc('week', e.purchased_at) = date_trunc('week', now())")
    .groupBy(
      'c.id', 'c.title', 'c.short_desc', 'c.cover_url',
      'cat.name', 'u.name', 'c.price', 'c.promo_price'
    )
    .orderBy('enroll_count', 'desc')
    .limit(limit)
    .then(rows =>
      rows.map(r => ({ ...r, enroll_count: Number(r.enroll_count) })),
    );
}

// Most viewed/bestseller (dựa vào students_count)
export function getMostViewedCourses(limit = 8) {
  return db('courses as c')
    .leftJoin('categories as cat', 'c.cat_id', 'cat.id')
    .leftJoin('instructors as ins', 'c.instructor_id', 'ins.id')
    .leftJoin('users as u', 'ins.user_id', 'u.id')
    .select(
      'c.id',
      'c.title',
      'c.cover_url as image',
      'c.short_desc as shortDesc',
      'c.students_count',
      db.raw("coalesce(cat.name, 'Uncategorized') as category_name"),
      db.raw("coalesce(u.name, 'Giảng viên chưa rõ') as teacher_name"),
      db.raw('coalesce(c.price, 0) as price'),
      db.raw('coalesce(c.promo_price, 0) as promo_price')
    )
    .orderBy('c.students_count', 'desc')
    .limit(limit);
}

// Newest
export function getNewestCourses(limit = 4, offset = 0) {
  return db('courses as c')
    .leftJoin('categories as cat', 'c.cat_id', 'cat.id')
    .leftJoin('instructors as ins', 'c.instructor_id', 'ins.id')
    .leftJoin('users as u', 'ins.user_id', 'u.id')
    .select(
      'c.id',
      'c.title',
      'c.cover_url as image',
      'c.short_desc as shortDesc',
      db.raw("coalesce(cat.name, 'Uncategorized') as category_name"),
      db.raw("coalesce(u.name, 'Giảng viên chưa rõ') as teacher_name"),
      db.raw('coalesce(c.rating_avg, 0) as rating'),
      db.raw('coalesce(c.rating_count, 0) as rating_count'),
      db.raw('coalesce(c.price, 0) as price'),
      db.raw('coalesce(c.promo_price, 0) as promo_price'),
      'c.created_at'
    )
    .orderBy('c.created_at', 'desc')
    .limit(limit)
    .offset(offset);
}

export function countNewestCourses() {
  return db('courses').count({ amount: 'id' }).then(row => Number(row[0].amount));
}

// Lấy detail có join (không trùng findById)
export function getByIdJoined(id) {
  return db('courses as c')
    .leftJoin('categories as cat', 'c.cat_id', 'cat.id')
    .leftJoin('instructors as ins', 'c.instructor_id', 'ins.id')
    .leftJoin('users as u', 'ins.user_id', 'u.id')
    .select(
      'c.id',
      'c.title',
      'c.cover_url as image',
      'c.long_desc_html as long_desc_html',
      db.raw("coalesce(cat.name, 'Uncategorized') as category_name"),
      db.raw("coalesce(u.name, 'Giảng viên chưa rõ') as teacher_name"),
      db.raw('coalesce(c.rating_avg, 0) as rating'),
      db.raw('coalesce(c.rating_count, 0) as rating_count'),
      db.raw('coalesce(c.price, 0) as price'),
      db.raw('coalesce(c.promo_price, 0) as promo_price')
    )
    .where('c.id', id)
    .first();
}

// Courses theo category (tự động gom category con nếu là nhóm cha)
export async function getCoursesByCategory(catId, limit = 6, offset = 0) {
  return db.transaction(async trx => {
    const subCats = await trx('categories').select('id').where('parent_id', catId);

    let q = trx('courses as c')
      .leftJoin('categories as cat', 'c.cat_id', 'cat.id')
      .leftJoin('instructors as ins', 'c.instructor_id', 'ins.id')
      .leftJoin('users as u', 'ins.user_id', 'u.id')
      .select(
        'c.id',
        'c.title',
        'c.cover_url as image',
        'c.short_desc as shortDesc',
        db.raw("coalesce(cat.name, 'Uncategorized') as category_name"),
        db.raw("coalesce(u.name, 'Giảng viên chưa rõ') as teacher_name"),
        db.raw('coalesce(c.rating_avg, 0) as rating'),
        db.raw('coalesce(c.rating_count, 0) as rating_count'),
        db.raw('coalesce(c.price, 0) as price'),
        db.raw('coalesce(c.promo_price, 0) as promo_price')
      )
      .orderBy('c.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (subCats.length > 0) {
      q.whereIn('c.cat_id', subCats.map(c => c.id));
    } else {
      q.where('c.cat_id', catId);
    }
    return q;
  });
}

// Best-seller trên trung bình
export function findBestSellerAboveAvg(limit = 8) {
  return db('courses')
    .where('students_count', '>', db.raw('(SELECT AVG(students_count) FROM courses)'))
    .orderBy('students_count', 'desc')
    .limit(limit);
}

// Newest trong 7 ngày
export function findNewest7day() {
  return db('courses')
    .where('created_at', '>=', db.raw("CURRENT_DATE - INTERVAL '7 days'"))
    .orderBy('created_at', 'desc')
    .limit(8)
    .offset(0);
}

// Full-text search (plainto_tsquery trên cột fts)
export function findByKeyword(keyword, { limit = 10, offset = 0 } = {}) {
  return db('courses')
    .whereRaw("fts @@ plainto_tsquery('english', ?)", [keyword])
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);
}

export function countByKeyword(keyword) {
  return db('courses')
    .count('*')
    .whereRaw("fts @@ plainto_tsquery('english', ?)", [keyword])
    .first();
}

// Top 10 theo view_count (nếu schema có cột này)
export function findTop10ViewedCourses() {
  return db('courses')
    .orderBy('view_count', 'desc')
    .limit(10);
}

// Một vài helper danh sách đơn giản (compat)
export function all() {
  return db('courses').select('*');
}
export function findAllCourses() {
  return db('courses').select('*');
}
export function findCourses({ limit = 12, offset = 0, sortBy = 'rating' } = {}) {
  let query = db('courses').select('*');
  switch (sortBy) {
    case 'rating':     query.orderBy('rating_avg', 'desc');      break;
    case 'price':      query.orderBy('price', 'asc');            break;
    case 'newest':     query.orderBy('created_at', 'desc');      break;
    case 'bestseller': query.orderBy('students_count', 'desc');  break;
    default:           query.orderBy('rating_avg', 'desc');
  }
  return query.limit(limit).offset(offset);
}
export function countCourses() {
  return db('courses').count('id as count').first();
}

/* =========================================
 * DEFAULT EXPORT 
 * ========================================= */
export default {
  // core
  findAll, findById, add, patch,
  // instructor
  findByInstructor, findPageByInstructor, countByInstructor, canComplete, markCompleted,
  // admin
  setRemoved, findPageAdmin, countAdmin,
  // util
  countByCat, countByCategory,
  // preview/detail
  findFullById, findOutlinePreview, findTopByCategory, getByIdJoined,
  // feeds/search
  getFeaturedCourses, getMostViewedCourses, getNewestCourses, countNewestCourses,
  getCoursesByCategory, findBestSellerAboveAvg, findNewest7day,
  findByKeyword, countByKeyword, findTop10ViewedCourses,
  // misc/compat
  all, findAllCourses, findCourses, countCourses,
};

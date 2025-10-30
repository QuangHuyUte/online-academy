// models/course.model.js
import db from '../utils/db.js';
import * as categoryModel from './category.model.js'; // để bọc các hàm compat gọi sang category

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

export async function add(course) {
  // Postgres: trả về [{ id }]
  return await db('courses').insert(course).returning('id');
}

export async function patch(id, course) {
  return await db('courses')
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

export function findOverviewByInstructorFlex(instructorId, _userId, limit = 10, offset = 0) {
  return db('courses as c')
    .leftJoin('categories as cat', 'cat.id', 'c.cat_id')
    .leftJoin(
      db('enrollments').select('course_id').count('* as students_count').groupBy('course_id').as('enr'),
      'enr.course_id', 'c.id'
    )
    .leftJoin(
      db('reviews').select('course_id').avg('rating as rating_avg').count('* as rating_count').groupBy('course_id').as('rev'),
      'rev.course_id', 'c.id'
    )
    .where('c.instructor_id', instructorId) // 👈 thay vì whereIn([...])
    .select(
      'c.id','c.title','c.cover_url','c.cat_id','c.is_completed','c.is_removed',
      'c.last_updated_at','c.view_count',
      db.raw('COALESCE(enr.students_count, 0) as students_count'),
      db.raw('ROUND(COALESCE(rev.rating_avg, 0)::numeric, 2) as rating_avg'),
      db.raw('COALESCE(rev.rating_count, 0) as rating_count'),
      'cat.name as category'
    )
    .orderBy('c.last_updated_at','desc')
    .limit(limit).offset(offset);
}


export function countByInstructorFlex(instructorId, userId) {
  const ids = [instructorId, userId].filter(Boolean);
  return db('courses').whereIn('instructor_id', ids).count('* as amount').first();
}

export async function overviewMetricsFlex(instructorId, userId) {
  const ids = [instructorId, userId].filter(Boolean);

  const [{ amount: total_courses }] = await db('courses')
    .whereIn('instructor_id', ids)
    .count('* as amount');

  const [{ total_students }] = await db('enrollments as e')
    .join('courses as c', 'c.id', 'e.course_id')
    .whereIn('c.instructor_id', ids)
    .count('* as total_students');

  const [{ avg_rating, rating_count }] = await db('reviews as r')
    .join('courses as c', 'c.id', 'r.course_id')
    .whereIn('c.instructor_id', ids)
    .avg('r.rating as avg_rating')
    .count('* as rating_count');

  const [{ total_views }] = await db('courses')
    .whereIn('instructor_id', ids)
    .sum('view_count as total_views');

  return {
    total_courses: Number(total_courses || 0),
    total_students: Number(total_students || 0),
    avg_rating: (avg_rating ? Number(avg_rating).toFixed(2) : '0.00'),
    total_views: Number(total_views || 0),
    rating_count: Number(rating_count || 0),
  };
}

export function findPageByInstructor(instructorId, offset = 0, limit = 10, { excludeRemoved = false } = {}) {
  const q = db('courses as c')
    .leftJoin('categories as cat', 'cat.id', 'c.cat_id')
    .select(
      'c.id', 'c.title', 'c.cover_url',
      'c.price', 'c.promo_price',
      'c.is_completed', 'c.is_removed',
      'c.last_updated_at',
      db.raw('COALESCE(cat.name, c.cat_id::text) as category'),
      'c.students_count', 'c.rating_avg', 'c.rating_count', 'c.view_count'
    )
    .where('c.instructor_id', instructorId)
    .orderBy('c.id', 'desc')
    .offset(offset)
    .limit(limit);

  if (excludeRemoved) q.andWhere('c.is_removed', false);
  return q;
}


export function countByInstructors(instructorId, { excludeRemoved = false } = {}) {
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
  const exists_lesson = r2?.[0]?.exists_lesson;
  return Boolean(exists_section && exists_lesson);
}

export function markCompleted(id) {
  return db('courses')
    .where('id', id)
    .update({ is_completed: true, last_updated_at: db.fn.now() });
}

export async function getCourseStats(courseId) {
  const [{ students_count }] = await db('enrollments').where({ course_id: courseId }).count('* as students_count');
  const [{ rating_avg, rating_count }] = await db('reviews')
    .where({ course_id: courseId })
    .avg('rating as rating_avg')
    .count('* as rating_count');

  return {
    students_count: Number(students_count || 0),
    rating_avg: rating_avg ? Number(rating_avg) : null,
    rating_count: Number(rating_count || 0),
  };
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
    .andWhere(builder =>
      builder.whereNull('is_removed').orWhere('is_removed', false)
    )
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
export async function getCoursesByCategory(catId, limit = 6, offset = 0, sort) {
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
        db.raw('coalesce(c.rating_avg, 0) as rating_avg'),
        db.raw('coalesce(c.rating_count, 0) as rating_count'),
        db.raw('coalesce(c.price, 0) as price'),
        db.raw('coalesce(c.promo_price, 0) as promo_price')
      )
      .andWhere(builder =>
        builder.whereNull('c.is_removed').orWhere('c.is_removed', false)
      );

    // Lọc category cha/con
    if (subCats.length > 0) {
      q.whereIn('c.cat_id', subCats.map(c => c.id));
    } else {
      q.where('c.cat_id', catId);
    }

    // Xử lý sort
    switch (sort) {
      case 'rating_desc':
        q.orderBy('c.rating_avg', 'desc');
        break;
      case 'rating_asc':
        q.orderBy('c.rating_avg', 'asc');
        break;
      case 'price_desc':
        // ưu tiên promo_price, nếu không có thì price
        q.orderByRaw('coalesce(c.promo_price, c.price) desc');
        break;
      case 'price_asc':
        q.orderByRaw('coalesce(c.promo_price, c.price) asc');
        break;
      case 'newest':
        q.orderBy('c.created_at', 'desc');
        break;
      default:
        q.orderBy('c.created_at', 'desc');
    }

    // Limit và offset luôn đặt sau orderBy
    q.limit(limit).offset(offset);

    return q;
  });
}
export function finBestSellerthanAvg(limit = 8) {
  return findBestSellerAboveAvg(limit);
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
export function findByKeyword(keyword, { limit = 4, offset = 0, sort = "rating" } = {}) {
  const query = db('courses').whereRaw("fts @@ plainto_tsquery('english', ?)", [keyword])
  switch (sort) {
    case 'rating':
      query.orderBy('rating_avg', 'desc');
      break;
    case 'price':
      query.orderByRaw('COALESCE(promo_price, price) ASC');
      break;
    case 'newest':
      query.orderBy('created_at', 'desc');
      break;
    case 'bestseller':
      query.orderBy('students_count', 'desc');
      break;

  }
  return query.limit(limit).offset(offset);
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
    case 'rating': query.orderBy('rating_avg', 'desc'); break;
    case 'price': query.orderBy('price', 'asc'); break;
    case 'newest': query.orderBy('created_at', 'desc'); break;
    case 'bestseller': query.orderBy('students_count', 'desc'); break;
    default: query.orderBy('rating_avg', 'desc');
  }
  return query.limit(limit).offset(offset);
}
export function countCourses() {
  return db('courses').count('id as count').first();
}

/* =========================================
 * COMPAT WRAPPERS (giữ tên cũ để không vỡ route cũ)
 * ========================================= */

// 1) Giữ lại tên cũ cho đếm khoá theo category (route cũ dùng)
export function countCoursesByCategory(categoryId) {
  return countByCat(categoryId);
}

// 2) Nếu code cũ từng gọi getTopCategories từ courseModel,
//    ta bọc lại và gọi sang categoryModel (tránh duplicate logic).
export function getTopCategories(limit = 5) {
  return categoryModel.getTopCategories(limit);
}

// 3) Khôi phục tạm findTopFieldCourses nếu còn nơi dùng (giữ nguyên logic cũ)
export function findTopFieldCourses(limit = 5) {
  return db('categories as c')
    .join('courses as co', 'c.id', 'co.cat_id')
    .join('enrollments as e', 'co.id', 'e.course_id')
    .select('c.id', 'c.name')
    .count({ enroll_count: 'e.course_id' })
    .whereBetween('c.id', [6, 30])
    .groupBy('c.id', 'c.name')
    .orderBy('enroll_count', 'desc')
    .limit(limit)
    .then(rows =>
      rows.map(r => ({
        id: r.id,
        name: r.name,
        enroll_count: Number(r.enroll_count)
      }))
    );
}

/**
 * Lấy danh sách khoá của 1 instructor kèm thống kê:
 * - students_count: số enrollment
 * - rating_avg, rating_count: thống kê review
 * - view_count: cột trên bảng courses
 * Có phân trang.
 */
export function findOverviewByInstructor(instructorId, limit = 10, offset = 0) {
  return db('courses as c')
    .leftJoin('categories as cat', 'cat.id', 'c.cat_id')
    .select(
      'c.id', 'c.title', 'c.cover_url',
      db.raw('COALESCE(cat.name, c.cat_id::text) as category'),
      'c.students_count',
      'c.rating_avg', 'c.rating_count',
      'c.view_count',
      'c.is_completed', 'c.is_removed',
      'c.last_updated_at'
    )
    .where('c.instructor_id', instructorId)
    .andWhere('c.is_removed', false)
    .orderBy('c.id', 'desc')
    .offset(offset)
    .limit(limit);
}

export function countByInstructor(instructorId) {
  return db('courses')
    .where('instructor_id', instructorId)
    .count('* as amount')
    .first();
}

/** (Tuỳ chọn) Tổng hợp số liệu KPIs cho header */
export async function overviewMetrics(instructorId) {
  const [{ amount: total_courses }] = await Promise.all([
    db('courses').where('instructor_id', instructorId).count('* as amount')
  ]);

  const [{ total_students }] = await db('enrollments as e')
    .join('courses as c', 'c.id', 'e.course_id')
    .where('c.instructor_id', instructorId)
    .count('* as total_students');

  const [{ avg_rating, rating_count }] = await db('reviews as r')
    .join('courses as c', 'c.id', 'r.course_id')
    .where('c.instructor_id', instructorId)
    .avg('r.rating as avg_rating')
    .count('* as rating_count');

  const [{ total_views }] = await db('courses')
    .where('instructor_id', instructorId)
    .sum('view_count as total_views');

  return {
    total_courses: Number(total_courses || 0),
    total_students: Number(total_students || 0),
    avg_rating: (avg_rating ? Number(avg_rating).toFixed(2) : '0.00'),
    total_views: Number(total_views || 0),
    rating_count: Number(rating_count || 0),
  };
}

/* =========================================
 * DEFAULT EXPORT 
 * ========================================= */
export default {
  // core
  findAll, findById, add, patch,
  // instructor
  findByInstructor, findPageByInstructor, countByInstructors, canComplete, markCompleted,
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
  // compat & misc
  all, findAllCourses, findCourses, countCourses,
  finBestSellerthanAvg,
  countCoursesByCategory, getTopCategories, findTopFieldCourses,

  findOverviewByInstructor, overviewMetrics, countByInstructor,

  getCourseStats, countByInstructorFlex, findOverviewByInstructorFlex, overviewMetricsFlex,
};

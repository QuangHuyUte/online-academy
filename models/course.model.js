import db from '../utils/db.js';

export default {
  toNumberCounts(row, keys = ['enroll_count']) {
    const out = { ...row };
    for (const k of keys) {
      if (out[k] !== undefined) out[k] = Number(out[k]);
    }
    return out;
  },

  getFeaturedCourses(limit = 4) {
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
        db.raw("coalesce(c.price, 0) as price"),
        db.raw("coalesce(c.promo_price, 0) as promo_price")
      )
      .count({ enroll_count: 'e.course_id' })
      .whereRaw("date_trunc('week', e.purchased_at) = date_trunc('week', now())")
      .groupBy('c.id', 'c.title', 'c.short_desc', 'c.cover_url', 'cat.name', 'u.name', 'c.price', 'c.promo_price')
      .orderBy('enroll_count', 'desc')
      .limit(limit)
      .then(rows => rows.map(r => this.toNumberCounts(r, ['enroll_count'])));
  },

  getMostViewedCourses(limit = 8) {
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
        db.raw("coalesce(c.price, 0) as price"),
        db.raw("coalesce(c.promo_price, 0) as promo_price")
      )
      .orderBy('c.students_count', 'desc')
      .limit(limit);
  },

  getNewestCourses(limit = 4, offset = 0) {
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
        db.raw("coalesce(c.rating_avg, 0) as rating"),
        db.raw("coalesce(c.rating_count, 0) as rating_count"),
        db.raw("coalesce(c.price, 0) as price"),
        db.raw("coalesce(c.promo_price, 0) as promo_price"),
        'c.created_at'
      )
      .orderBy('c.created_at', 'desc')
      .limit(limit)
      .offset(offset);
  },

  countNewestCourses() {
    return db('courses').count({ amount: 'id' }).then(row => Number(row[0].amount));
  },

  getById(id) {
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
        db.raw("coalesce(c.rating_avg, 0) as rating"),
        db.raw("coalesce(c.rating_count, 0) as rating_count"),
        db.raw("coalesce(c.price, 0) as price"),
        db.raw("coalesce(c.promo_price, 0) as promo_price")
      )
      .where('c.id', id)
      .first();
  },

  getTopCategories(limit = 5) {
    return db('categories as c')
      .join('courses as co', 'c.id', 'co.cat_id')
      .join('enrollments as e', 'co.id', 'e.course_id')
      .select('c.id', 'c.name')
      .count({ enroll_count: 'e.course_id' })
      .whereRaw("date_trunc('week', e.purchased_at) = date_trunc('week', now())")
      .groupBy('c.id', 'c.name')
      .orderBy('enroll_count', 'desc')
      .limit(limit)
      .then(rows => rows.map(r => ({ id: r.id, name: r.name, enroll_count: Number(r.enroll_count) })));
  },

  getCoursesByCategory(catId, limit = 6, offset = 0) {
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
        db.raw("coalesce(c.rating_avg, 0) as rating"),
        db.raw("coalesce(c.rating_count, 0) as rating_count"),
        db.raw("coalesce(c.price, 0) as price"),
        db.raw("coalesce(c.promo_price, 0) as promo_price")
      )
      .where('c.cat_id', catId)
      .limit(limit)
      .offset(offset);
  },

  countByCategory(catId) {
    return db('courses').where('cat_id', catId).count({ amount: 'id' }).then(list => Number(list[0].amount));
  },

  // Compatibility helpers used in routes
  all() {
    return db('courses').select('*');
  },

  add(course) {
    return db('courses').insert(course);
  },

  countCoursesByCategory(categoryId) {
    return db('courses').where('cat_id', categoryId).count({ amount: 'id' }).then(row => Number(row[0].amount));
  }
};

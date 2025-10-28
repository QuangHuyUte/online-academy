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
      'cat.id as cat_id',              // ✅ Thêm dòng này
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
  return db.transaction(async trx => {
    // 🔹 Lấy danh sách category con
    const subCats = await trx('categories')
      .select('id')
      .where('parent_id', catId);

    // 🔹 Tạo query cơ bản
    let query = trx('courses as c')
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
      .limit(limit)
      .offset(offset);

    // 🔹 Nếu có danh mục con → lấy tất cả
    if (subCats.length > 0) {
      const subCatIds = subCats.map(c => c.id);
      query.whereIn('c.cat_id', subCatIds);
    } else {
      // 🔹 Ngược lại (category con) → giữ logic cũ
      query.where('c.cat_id', catId);
    }

    return query;
  }); // ✅ đóng ngoặc kết thúc db.transaction()
}, // ✅ đóng ngoặc kết thúc hàm getCoursesByCategory()//Cuong them

  

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
  },
  // bên dưới của vũ
  findAllCourses() {
    return db('courses').select('*');
  },

  findCourses({ limit, offset, sortBy }) {
    let query = db('courses').select('*');

    switch (sortBy) {
      case 'rating':
        query.orderBy('rating_avg', 'desc');
        break;
      case 'price':
        query.orderBy('price', 'asc');
        break;
      case 'newest':
        query.orderBy('created_at', 'desc');
        break;
      case 'bestseller':
        query.orderBy('students_count', 'desc');
        break;
      default:
        query.orderBy('rating_avg', 'desc');
    }

    query.limit(limit).offset(offset);
    return query;
  },

  countCourses() {
    return db('courses').count('id as count').first();
  },
  findNewest7day() {
    return db('courses')
      .select('*')
      .where('created_at', '>=', db.raw('CURRENT_DATE - INTERVAL \'7 days\''))
      .orderBy('created_at', 'desc')
      .limit(8)
      .offset(0);
  },
  finBestSellerthanAvg() {
    return db('courses')
      .select('*')
      .where('students_count', '>', db.raw('(SELECT AVG(students_count) FROM courses)'))
      .orderBy('students_count', 'desc')
      .limit(6)
      .limit(8)
      .offset(0);
  },
  findByKeyword(keyword, { limit = 10, offset = 0 } = {}) {
    return db('courses')
      .select('*')
      .whereRaw(
        "fts @@ plainto_tsquery('english', ?)",
        [keyword]
      )
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  },

  countByKeyword(keyword) {
    return db('courses')
      .count('*')
      .whereRaw(
        "fts @@ plainto_tsquery('english', ?)",
        [keyword]
      )
      .first()
  },
  findTop10ViewedCourses() {
    return db('courses')
      .select('*')
      .orderBy('view_count', 'desc')
      .limit(10);
  },
  findTopFieldCourses(limit = 5) {
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
  },

  // ✅ Thêm ba hàm export để tái sử dụng
  findFullById,
  findOutlinePreview,
  findTopByCategory
};







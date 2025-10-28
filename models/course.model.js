import db from '../utils/db.js';
export default {
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
    .first();
}


}

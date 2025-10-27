import db from '../utils/db.js';

export default {
    findCategoriesParent() {
        return db('categories').where('parent_id', null);
    },
    findCategoriesByParentId(parentId) {
        return db('categories').where('parent_id', parentId);
    },
    findCoursesByCategoryId(categoryId) {
        return db('courses').where('cat_id', categoryId);
    },
    findCategoryNotParent() {
        return db('categories').whereNotNull('parent_id');
    },
    findAllCourse(){
        return db('courses');
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

  getMenuCategories() {
    return Promise.all([this.findCategoriesParent(), this.findCategoryNotParent()]).then(([parents, children]) => {
      const map = parents.map(p => ({ ...p, children: [] }));
      const byId = new Map(map.map(p => [p.id, p]));

      for (const c of children) {
        const parent = byId.get(c.parent_id);
        if (parent) parent.children.push(c);
      }

      return map;
    });
  }
};

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
    }
    
}
import express from 'express';
import courseModel from '../models/course.model.js';
import categoryModel from '../models/category.model.js';

const router = express.Router();

// Category listing with pagination
router.get('/category/:id', async (req, res) => {
  const catId = +req.params.id || 0;
  const limit = 6;
  const page = +req.query.page || 1;
  const offset = (page - 1) * limit;

  try {
    const [total, list, menu] = await Promise.all([
      courseModel.countCoursesByCategory(catId),
      courseModel.getCoursesByCategory(catId, limit, offset),
      categoryModel.getMenuCategories()
    ]);

    const nPages = Math.max(1, Math.ceil(total / limit));
    const pageNumbers = [];
    for (let i = 1; i <= nPages; i++) {
      pageNumbers.push({ value: i, isActive: i === page });
    }

    res.render('course/list', {
      courses: list,
      empty: list.length === 0,
      pageNumbers,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < nPages ? page + 1 : null,
      currentPage: page,
      totalPages: nPages,
      menu
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi khi tải danh sách khóa học');
  }
});

export default router;

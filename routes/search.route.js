import express from 'express';
import * as courseModel from '../models/course.model.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const keyword = String(req.query.keyword || '').trim();
    const sort = String(req.query.sort || 'rating'); // rating | price | newest | bestseller
    const limit = Math.max(1, Number(req.query.limit) || 12);
    const page = Math.max(1, Number(req.query.page) || 1);
    const offset = (page - 1) * limit;

    let courses = [];
    let totalCount = 0;

    if (keyword) {
      // Tìm kiếm theo từ khóa
      const [rows, cnt] = await Promise.all([
        courseModel.findByKeyword(keyword, { limit, offset }),
        courseModel.countByKeyword(keyword),
      ]);
      courses = rows;
      totalCount = Number(cnt?.count || cnt?.amount || 0);
    } else {
      // Không có từ khóa -> sắp xếp mặc định
      const [rows, cnt] = await Promise.all([
        courseModel.findCourses({ limit, offset, sortBy: sort }),
        courseModel.countCourses(),
      ]);
      courses = rows;
      totalCount = Number(cnt?.count || 0);
    }

    // Tính phân trang
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const baseUrl = `/search?keyword=${encodeURIComponent(keyword)}&sort=${encodeURIComponent(sort)}&limit=${limit}`;

    const pagination = {
      page,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      prevUrl: `${baseUrl}&page=${Math.max(1, page - 1)}`,
      nextUrl: `${baseUrl}&page=${Math.min(totalPages, page + 1)}`,
      pages: Array.from({ length: totalPages }, (_, i) => {
        const p = i + 1;
        return { page: p, active: p === page, url: `${baseUrl}&page=${p}` };
      }),
    };

    res.render('search/results', {
      title: keyword ? `Search results for "${keyword}"` : 'Search Courses',
      courses,
      keyword,
      sort,
      limit,
      totalCount,
      pagination,
    });
  } catch (err) {
    console.error('❌ Search route error:', err);
    next(err);
  }
});

export default router;

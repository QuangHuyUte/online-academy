import express from 'express';
import * as courseModel from '../models/course.model.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const keyword = String(req.query.keyword || '').trim();
    const sort = String(req.query.sort || 'rating'); // rating | price | newest | bestseller
    const limit = 4;
    const page = Math.max(1, Number(req.query.page) || 1);
    const offset = (page - 1) * limit;

    // --- Lấy khóa học search + tổng số ---
    const [rows, cnt, featuredCourses] = await Promise.all([
      courseModel.findByKeyword(keyword, { limit, offset, sort }),
      courseModel.countByKeyword(keyword),
      courseModel.getFeaturedCourses(4), // top 10 nổi bật trong tuần
    ]);

    let courses = rows;
    const totalCount = Number(cnt?.count || cnt?.amount || 0);

    // --- Gắn cờ isNew / isFeatured ---
    const now = new Date();
    const featuredIds = new Set(featuredCourses.map(c => c.id));

    courses = courses.map(c => {
      const createdAt = new Date(c.created_at);
      const isNew = (now - createdAt) <= 7 * 24 * 60 * 60 * 1000; 
      const isFeatured = featuredIds.has(c.id);
      return { ...c, isNew, isFeatured };
    });

    // --- Tính phân trang ---
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

    // --- Render ---
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

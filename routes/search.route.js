import express from 'express';
import courseModel from '../models/course.model.js';
const router = express.Router();

router.get('/', async function (req, res) {
  const featured_newest = await courseModel.findNewest7day();
  const featured_bestseller = await courseModel.finBestSellerthanAvg();

  const keyword = req.query.keyword || '';
  console.log('Keyword:', keyword);
  const sort = req.query.sort || 'rating';
  const limit = 4;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;

  let courses = [];
  let totalCount = 0;

  if (keyword !== '') {
    // có search
    courses = await courseModel.findByKeyword(keyword, { limit, offset });
    const countResult = await courseModel.countByKeyword(keyword);
    totalCount = parseInt(countResult.count);
  } else {
    // không search, dùng lọc mặc định
    courses = await courseModel.findCourses({ limit, offset, sortBy: sort });
    const total = await courseModel.countCourses();
    totalCount = parseInt(total.count);
  }

  // tính page_numbers 
  const nPages = Math.ceil(totalCount / limit);
  const page_numbers = [];
  for (let i = 1; i <= nPages; i++) {
    page_numbers.push({
      value: i,
      isCurrent: i === page
    });
  }

  res.render('search/results', {
    courses,
    page_numbers,
    sort,
    keyword,
    featured_newest,
    featured_bestseller
  });
});

export default router;

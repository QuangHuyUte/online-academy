// routes/preview.route.js
import express from 'express';
import db from '../utils/db.js';

const router = express.Router();

router.get('/preview/lesson/:lessonId', async (req, res, next) => {
  try {
    const lessonId = Number(req.params.lessonId);

    const les = await db('lessons as l')
      .join('sections as s', 's.id', 'l.section_id')
      .join('courses as c', 'c.id', 's.course_id')
      .leftJoin('categories as cat', 'cat.id', 'c.cat_id')
      .select(
        'l.*',
        's.course_id',
        'c.title as course_title',
        'cat.name as category'
      )
      .where('l.id', lessonId)
      .andWhere('l.is_preview', true)
      .first();

    if (!les) return res.sendStatus(404);

    const siblings = await db('lessons as l')
      .join('sections as s', 's.id', 'l.section_id')
      .where('s.course_id', les.course_id)
      .select('l.id','l.title','l.order_no')
      .orderBy('s.order_no','asc')
      .orderBy('l.order_no','asc');

    res.render('vwStudent/player', {
      title: `Preview — ${les.title}`,
      lesson: les,
      lessons: siblings
    });
  } catch (err) { next(err); }
});

export default router;

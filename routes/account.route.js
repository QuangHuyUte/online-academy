import express from 'express';
import * as watchlistModel from '../models/watchlist.model.js';

const router = express.Router();

router.get('/watchlist', async (req, res) => {
  const user_id = req.session.userId || 1; // giả lập user 1

  try {
    const list = await watchlistModel.findAllByUser(user_id);
    res.render('vwAccount/watchlist', {
      watchlist: list,
      hasCourses: list.length > 0
    });
  } catch (err) {
    console.error('❌ Error loading watchlist:', err);
    res.status(500).send('Không thể tải danh sách yêu thích.');
  }
});

export default router;

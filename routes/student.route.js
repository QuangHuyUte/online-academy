import express from "express";
import db from "../utils/db.js"; 
const router = express.Router();

router.post("/progress/:lessonId", async (req, res) => {
  try {
    // ⚙️ Đổi dòng này
    const userId = req.session?.authUser?.id ?? req.session?.authUser?.user_id;

    if (!userId)
      return res.status(401).json({ success: false, message: "Not logged in" });

    const { lessonId } = req.params;
    const { watched_sec, is_done } = req.body;

    const existing = await db("progress")
      .where({ user_id: userId, lesson_id: lessonId })
      .first();

    if (existing) {
      await db("progress")
        .where({ user_id: userId, lesson_id: lessonId })
        .update({
          watched_sec,
          is_done,
          updated_at: db.fn.now(),
        });
    } else {
      await db("progress").insert({
        user_id: userId,
        lesson_id: lessonId,
        watched_sec,
        is_done,
        updated_at: db.fn.now(),
      });
    }

    res.json({ success: true });
  } catch (err) {
  console.error("❌ Error saving progress:", err);
    res.status(500).json({ success: false });
  }
});


export default router;

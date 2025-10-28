import db from "../utils/db.js";

async function getMyCoursesProgress(userId) {
  return await db("enrollments as e")
    .join("courses as c", "e.course_id", "c.id")
    .leftJoin("instructors as i", "c.instructor_id", "i.id")
    .leftJoin("users as u", "i.user_id", "u.id")
    .leftJoin("sections as s", "s.course_id", "c.id")
    .leftJoin("lessons as l", "l.section_id", "s.id")
    .leftJoin("progress as p", function () {
      this.on("p.lesson_id", "=", "l.id")
        .andOn("p.user_id", "=", db.raw("?", [userId]));
    })
    .select(
      "c.id as course_id",
      "c.title",
      "c.cover_url",
      "u.name as instructor_name", 
      db.raw(`
        COALESCE(ROUND(
          100.0 * SUM(CASE WHEN p.is_done THEN 1 ELSE 0 END) / NULLIF(COUNT(l.id), 0)
        ), 0) as progress_percent
      `)
    )
    .where("e.user_id", userId)
    .groupBy("c.id", "u.name", "c.cover_url", "c.title");
}

export default { getMyCoursesProgress };

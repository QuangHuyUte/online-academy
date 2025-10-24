// models/enrollment.model.js
import database from "../utils/database.js";

export async function add(userId, courseId) {
  // Chống trùng: PK (user_id, course_id)
  return database("enrollments")
    .insert({ user_id: userId, course_id: courseId })
    .onConflict(["user_id", "course_id"])
    .ignore();
}

export async function getByUser(userId) {
  return database("courses as c")
    .join("enrollments as e", "c.id", "e.course_id")
    .leftJoin("instructors as ins", "ins.id", "c.instructor_id")
    .leftJoin("users as u", "u.id", "ins.user_id")
    .where("e.user_id", userId)
    .select(
      "c.id",
      "c.title",
      "c.short_desc",
      "c.cover_url",
      "c.price",
      "c.promo_price",
      "u.name as instructor_name"
    )
    .orderBy("c.id", "asc");
}

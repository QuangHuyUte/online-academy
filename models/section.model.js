import db from "../utils/db.js";

export async function findByCourse(course_id) {
  return db("sections").where({ course_id }).select("id", "title");
}

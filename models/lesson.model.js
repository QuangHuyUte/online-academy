import db from "../utils/db.js";

export async function findBySection(section_id) {
  return db("lessons").where({ section_id }).select("id", "title", "video_url");
}

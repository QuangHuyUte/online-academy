import db from "../utils/database.js";

// ✅ 1. Đánh dấu hoàn thành 1 bài học
export const updateProgress = async (userId, lessonId, watched_sec, is_done = false) => {
  await db("progress")
    .insert({
      user_id: userId,
      lesson_id: lessonId,
      watched_sec,
      is_done,
      updated_at: new Date(),
    })
    .onConflict(["user_id", "lesson_id"])
    .merge({
      watched_sec,
      is_done,
      updated_at: new Date(),
    });
};


// ✅ 2. Lấy danh sách section + lesson của 1 khóa học
export const getSectionsWithLessons = async (courseId) => {
  const sections = await db("sections")
    .where("course_id", courseId)
    .orderBy("id");

  for (const section of sections) {
    const lessons = await db("lessons")
      .where("section_id", section.id)
      .orderBy("id");
    section.lessons = lessons;
  }

  return sections;
};

// ✅ 3. Tính phần trăm hoàn thành khóa học
export const getCourseProgress = async (userId, courseId) => {
  const totalRow = await db("lessons")
    .join("sections", "lessons.section_id", "sections.id")
    .where("sections.course_id", courseId)
    .count("* as total")
    .first();

  const doneRow = await db("progress")
    .join("lessons", "progress.lesson_id", "lessons.id")
    .join("sections", "lessons.section_id", "sections.id")
    .where("sections.course_id", courseId)
    .andWhere("progress.user_id", userId)
    .andWhere("progress.is_done", true)
    .count("* as done")
    .first();

  const total = Number(totalRow.total || 0);
  const done = Number(doneRow.done || 0);
  return total > 0 ? Math.round((done / total) * 100) : 0;
};

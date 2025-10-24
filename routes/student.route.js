// routes/student.route.js
import express from "express";
import * as enrollmentModel from "../models/enrollment.model.js";
import database from "../utils/database.js";
import * as progressModel from "../models/progress.model.js";

const router = express.Router();

/**
 * POST /student/enroll/:courseId
 * => Đăng ký (enroll) khóa học cho học viên hiện tại
 */
router.post("/enroll/:courseId", async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).send("Bạn cần đăng nhập trước.");

    const courseId = parseInt(req.params.courseId, 10);
    if (isNaN(courseId)) return res.status(400).send("Course ID không hợp lệ.");

    await enrollmentModel.add(user.id, courseId);
    res.redirect("/student/my-courses");
  } catch (err) {
    console.error("❌ Lỗi khi enroll:", err);
    next(err);
  }
});

/**
 * GET /student/my-courses
 * => Hiển thị danh sách khóa học mà học viên đã đăng ký
 */
router.get("/my-courses", async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).send("Bạn cần đăng nhập trước.");

    const courses = await enrollmentModel.getByUser(user.id);

     for (const course of courses) {
      course.progress_percent = await progressModel.getCourseProgress(user.id, course.id);
    }

    res.render("student/my-courses", {
      title: "My Courses", // 👈 thêm title cho layout
      courses,
      hasCourses: courses.length > 0,
    });
  } catch (err) {
    console.error("❌ Lỗi khi tải danh sách khóa học:", err);
    next(err);
  }
});

/**
 * GET /student/dev/enroll-first
 * => Dành cho test: tự động enroll khóa học đầu tiên
 */
router.get("/dev/enroll-first", async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).send("Bạn cần đăng nhập trước.");

    const course = await database("courses").first("id");
    if (course) {
      await enrollmentModel.add(user.id, course.id);
    }
    res.redirect("/student/my-courses");
  } catch (err) {
    console.error("❌ Lỗi khi enroll-first:", err);
    next(err);
  }
});

// GET /student/enroll -> hiển thị danh sách khóa học theo lĩnh vực
router.get("/enroll", async (req, res, next) => {
  try {
    const categories = await database("categories")
      .select("id", "name")
      .orderBy("name");

    const categoryCourses = [];

    for (const cat of categories) {
      const courses = await database("courses")
        .where("cat_id", cat.id) 
        .select("id", "title", "short_desc", "cover_url as thumbnail_url");

      categoryCourses.push({
        ...cat,
        courses,
      });
    }
    res.render("student/enroll-courses", {
      title: "Đăng ký khóa học",
      categoryCourses,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /student/player/:courseId
 * => Hiển thị danh sách video của khóa học
 */
router.get("/player/:courseId", async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const sections = await progressModel.getSectionsWithLessons(courseId);
    const firstLesson = sections?.[0]?.lessons?.[0] || null;

    res.render("student/player", {
      title: "Learning Player",
      sections,
      firstLesson,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /student/progress/:lessonId
 * => Cập nhật tiến độ học bài
 */
router.post("/progress/:lessonId", async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).send("Bạn cần đăng nhập trước.");

    const watched = req.body.watched_sec || 0;
    const isDone = req.body.is_done || false;

    await progressModel.updateProgress(user.id, req.params.lessonId, watched, isDone);
    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
});


export default router;

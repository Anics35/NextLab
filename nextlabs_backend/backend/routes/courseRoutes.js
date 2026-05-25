const express = require("express");
const { createCourse, getCourse, joinCourse, listMyCourses, updateCourse, deleteCourse, removeStudentFromCourse } = require("../controllers/courseController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create", authenticate, requireRole("teacher"), createCourse);
router.post("/join", authenticate, requireRole("student"), joinCourse);
router.get("/my", authenticate, listMyCourses);
router.get("/:id", authenticate, getCourse);
router.put("/:id", authenticate, requireRole("teacher"), updateCourse);
router.delete("/:id", authenticate, requireRole("teacher"), deleteCourse);
router.delete("/:courseId/student/:studentId", authenticate, requireRole("teacher"), removeStudentFromCourse);

module.exports = router;

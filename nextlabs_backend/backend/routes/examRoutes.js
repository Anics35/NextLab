const express = require("express");
const { createExam, getExam, listCourseExams, updateExam, deleteExam, getEnrolledStudents, updateExamVisibility } = require("../controllers/examController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create", authenticate, requireRole("teacher"), createExam);
router.get("/course/:courseId", authenticate, listCourseExams);
router.get("/:id/enrolled-students", authenticate, requireRole("teacher"), getEnrolledStudents);
router.get("/:id", authenticate, getExam);
router.patch("/:id", authenticate, requireRole("teacher"), updateExam);
router.put("/:id", authenticate, requireRole("teacher"), updateExam);
router.put("/:id/update-visibility", authenticate, requireRole("teacher"), updateExamVisibility);
router.delete("/:id", authenticate, requireRole("teacher"), deleteExam);

module.exports = router;

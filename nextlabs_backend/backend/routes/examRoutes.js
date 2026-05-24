const express = require("express");
const { createExam, getExam, listCourseExams, updateExam } = require("../controllers/examController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create", authenticate, requireRole("teacher"), createExam);
router.get("/course/:courseId", authenticate, listCourseExams);
router.get("/:id", authenticate, getExam);
router.patch("/:id", authenticate, requireRole("teacher"), updateExam);
router.put("/:id", authenticate, requireRole("teacher"), updateExam);
router.delete("/:id", authenticate, requireRole("teacher"), require("../controllers/examController").deleteExam);

module.exports = router;

const express = require("express");
const {
  deleteCourse,
  deleteExam,
  deleteUser,
  downloadReports,
  getActivityLogs,
  getAnalytics,
  getProctorLogs,
  getReports,
  getSummary,
  getSubmissions,
  getUserActivity,
  listCourses,
  listExams,
  listUsers,
  setCourseArchived,
  setExamHidden,
  setUserDisabled
} = require("../controllers/adminController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate, requireRole("admin"));

router.get("/summary", getSummary);

router.get("/users", listUsers);
router.get("/users/:id/activity", getUserActivity);
router.delete("/users/:id", deleteUser);
router.patch("/users/:id/disable", setUserDisabled);

router.get("/courses", listCourses);
router.delete("/courses/:id", deleteCourse);
router.patch("/courses/:id/archive", setCourseArchived);

router.get("/exams", listExams);
router.delete("/exams/:id", deleteExam);
router.patch("/exams/:id/hide", setExamHidden);

router.get("/monitoring/analytics", getAnalytics);
router.get("/monitoring/proctor-logs", getProctorLogs);
router.get("/monitoring/activity-logs", getActivityLogs);
router.get("/monitoring/submissions", getSubmissions);
router.get("/monitoring/reports", getReports);
router.get("/monitoring/reports/download", downloadReports);

module.exports = router;

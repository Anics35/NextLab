const express = require("express");
const {
  finalizeAttempt,
  getMyAttempt,
  getStudentAttempt,
  listAttemptProblems,
  overrideScore,
  saveAttempt,
  startAttempt,
  submitAttempt
} = require("../controllers/examAttemptController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/start", authenticate, requireRole("student"), startAttempt);
router.post("/save", authenticate, requireRole("student"), saveAttempt);
router.post("/submit", authenticate, requireRole("student"), submitAttempt);
router.post("/finalize", authenticate, requireRole("student"), finalizeAttempt);
router.get("/:examId/me", authenticate, requireRole("student"), getMyAttempt);
router.get("/:examId/student/:studentId", authenticate, requireRole("teacher"), getStudentAttempt);
router.get("/attempt/:attemptId/problems", authenticate, listAttemptProblems);
router.patch("/:attemptId/score", authenticate, requireRole("teacher"), overrideScore);

module.exports = router;

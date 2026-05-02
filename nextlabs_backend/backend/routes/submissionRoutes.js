const express = require("express");
const { listSubmissions, listSubmissionsByExam, overrideSubmissionProblemScore } = require("../controllers/submissionController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, requireRole("teacher"), listSubmissions);
router.get("/exam/:examId", authenticate, requireRole("teacher"), listSubmissionsByExam);
router.put("/:submissionId/problem/:problemId/score", authenticate, requireRole("teacher"), overrideSubmissionProblemScore);

module.exports = router;

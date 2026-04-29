const express = require("express");
const { getExamAnalytics } = require("../controllers/analyticsController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/exam/:examId", authenticate, requireRole("teacher"), getExamAnalytics);

module.exports = router;

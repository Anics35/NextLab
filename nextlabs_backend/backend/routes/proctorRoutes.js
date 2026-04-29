const express = require("express");
const { listExamProctorEvents, recordProctorEvent } = require("../controllers/proctorController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/event", authenticate, requireRole("student"), recordProctorEvent);
router.get("/exam/:examId", authenticate, requireRole("teacher"), listExamProctorEvents);

module.exports = router;

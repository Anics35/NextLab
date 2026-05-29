const express = require("express");
const { downloadResultPdf, downloadExamReportPdf, downloadExamReportXlsx } = require("../controllers/resultController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/exam/:examId/pdf", authenticate, requireRole("teacher"), downloadExamReportPdf);
router.get("/exam/:examId/xlsx", authenticate, requireRole("teacher"), downloadExamReportXlsx);
router.get("/:examId/:studentId/pdf", authenticate, downloadResultPdf);

module.exports = router;

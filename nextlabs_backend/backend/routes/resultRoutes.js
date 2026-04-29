const express = require("express");
const { downloadResultPdf } = require("../controllers/resultController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:examId/:studentId/pdf", authenticate, downloadResultPdf);

module.exports = router;

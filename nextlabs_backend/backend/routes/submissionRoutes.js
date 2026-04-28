const express = require("express");
const { listSubmissions } = require("../controllers/submissionController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, requireRole("teacher"), listSubmissions);

module.exports = router;

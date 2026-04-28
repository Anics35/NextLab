const express = require("express");
const { listActivity } = require("../controllers/activityController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, requireRole("teacher"), listActivity);

module.exports = router;

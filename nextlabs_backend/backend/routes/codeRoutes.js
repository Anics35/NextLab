const express = require("express");
const { languages, run, submit } = require("../controllers/codeController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/languages", languages);
router.post("/run", authenticate, requireRole("student"), run);
router.post("/submit", authenticate, requireRole("student"), submit);

module.exports = router;

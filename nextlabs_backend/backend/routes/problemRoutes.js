const express = require("express");
const { createProblem, getProblem, listProblems } = require("../controllers/problemController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, listProblems);
router.get("/:id", authenticate, getProblem);
router.post("/", authenticate, requireRole("teacher"), createProblem);

module.exports = router;

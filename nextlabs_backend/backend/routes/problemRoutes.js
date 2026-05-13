const express = require("express");
const { createProblem, deleteProblem, getProblem, listProblems, updateProblem } = require("../controllers/problemController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, listProblems);
router.get("/all", authenticate, listProblems);
router.get("/:id", authenticate, getProblem);
router.post("/", authenticate, requireRole("teacher"), createProblem);
router.post("/create", authenticate, requireRole("teacher"), createProblem);
router.put("/:id", authenticate, requireRole("teacher"), updateProblem);
router.delete("/:id", authenticate, requireRole("teacher"), deleteProblem);

module.exports = router;

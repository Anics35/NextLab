const Submission = require("../models/Submission");
const { createApiError } = require("../utils/apiError");
const { isValidObjectId } = require("../utils/validators");

async function listSubmissions(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const filter = {};

    if (req.query.studentId) {
      filter.studentId = req.query.studentId;
    }

    if (req.query.problemId) {
      if (!isValidObjectId(req.query.problemId)) {
        throw createApiError(400, "problemId must be a valid MongoDB ObjectId", "INVALID_PROBLEM_ID");
      }

      filter.problemId = req.query.problemId;
    }

    const submissions = await Submission.find(filter)
      .populate("problemId", "title difficulty")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      count: submissions.length,
      submissions
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { listSubmissions };

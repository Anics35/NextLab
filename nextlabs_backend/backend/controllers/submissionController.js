const Submission = require("../models/Submission");
const { createApiError } = require("../utils/apiError");
const { isValidObjectId } = require("../utils/validators");

function normalizeSubmissionShape(submission) {
  const item = submission.toObject ? submission.toObject() : submission;
  if (Array.isArray(item.problems) && item.problems.length > 0) {
    return item;
  }

  if (!item.problemId) {
    return { ...item, problems: [] };
  }

  return {
    ...item,
    problems: [
      {
        problemId: item.problemId,
        code: item.code || "",
        language: item.language || "",
        input: item.input || "",
        output: item.output || "",
        score: Number(item.score || 0),
        maxMarks: 0,
        passed: Number(item.passed || 0),
        total: Number(item.total || 0),
        passedPublic: Number(item.passedPublic || 0),
        totalPublic: Number(item.totalPublic || 0),
        passedHidden: Number(item.passedHidden || 0),
        totalHidden: Number(item.totalHidden || 0),
        testResults: (item.details || []).map((detail) => ({
          input: detail.input || "",
          expected: detail.expectedOutput || "",
          output: detail.actualOutput || detail.error || "",
          passed: Boolean(detail.passed),
          isPublic: detail.visibility === "public",
          error: detail.error || ""
        })),
        manualOverride: false,
        submittedAt: item.updatedAt || item.createdAt
      }
    ]
  };
}

async function listSubmissions(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const filter = {};

    if (req.query.userId || req.query.studentId) {
      filter.userId = req.query.userId || req.query.studentId;
    }

    if (req.query.examId) {
      if (!isValidObjectId(req.query.examId)) {
        throw createApiError(400, "examId must be a valid MongoDB ObjectId", "INVALID_EXAM_ID");
      }
      filter.examId = req.query.examId;
    }

    const submissions = await Submission.find(filter)
      .populate("userId", "name email rollNumber semester")
      .populate("examId", "title")
      .populate("problemId", "title difficulty publicTestCases hiddenTestCases testCases")
      .populate("problems.problemId", "title difficulty publicTestCases hiddenTestCases testCases")
      .sort({ updatedAt: -1 })
      .limit(limit);

    res.json({ success: true, count: submissions.length, submissions: submissions.map(normalizeSubmissionShape) });
  } catch (error) {
    next(error);
  }
}

async function listSubmissionsByExam(req, res, next) {
  try {
    const { examId } = req.params;
    console.log("REQ examId:", req.params.examId);
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    if (!isValidObjectId(examId)) {
      throw createApiError(400, "examId must be a valid MongoDB ObjectId", "INVALID_EXAM_ID");
    }

    const submissions = await Submission.find({ examId })
      .populate("userId", "name email rollNumber semester")
      .populate("examId", "title")
      .populate("problemId", "title difficulty publicTestCases hiddenTestCases testCases")
      .populate("problems.problemId", "title difficulty publicTestCases hiddenTestCases testCases")
      .sort({ updatedAt: -1 })
      .limit(limit);

    res.json({ success: true, count: submissions.length, submissions: submissions.map(normalizeSubmissionShape) });
  } catch (error) {
    next(error);
  }
}

async function overrideSubmissionProblemScore(req, res, next) {
  try {
    const { submissionId, problemId } = req.params;
    const { score } = req.body;

    if (!isValidObjectId(submissionId) || !isValidObjectId(problemId)) {
      throw createApiError(400, "submissionId and problemId must be valid MongoDB ObjectIds", "INVALID_ID");
    }

    const numericScore = Number(score);
    if (!Number.isFinite(numericScore) || numericScore < 0) {
      throw createApiError(400, "score must be a valid non-negative number", "INVALID_SCORE");
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw createApiError(404, "Submission not found", "SUBMISSION_NOT_FOUND");
    }

    const problem = submission.problems.find((item) => String(item.problemId) === String(problemId));
    if (!problem) {
      throw createApiError(404, "Problem submission not found", "PROBLEM_SUBMISSION_NOT_FOUND");
    }

    problem.score = Number(numericScore.toFixed(2));
    problem.manualOverride = true;
    await submission.save();

    res.json({ success: true, submission });
  } catch (error) {
    next(error);
  }
}

module.exports = { listSubmissions, listSubmissionsByExam, overrideSubmissionProblemScore };

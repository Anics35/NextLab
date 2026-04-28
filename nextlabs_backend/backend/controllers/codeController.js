const ActivityEvent = require("../models/ActivityEvent");
const Problem = require("../models/Problem");
const Submission = require("../models/Submission");
const { evaluateSubmission } = require("../services/evaluator");
const { SUPPORTED_LANGUAGES, runCode } = require("../services/judge0");
const { createApiError } = require("../utils/apiError");
const { isBlank, isValidObjectId, toStringValue } = require("../utils/validators");

const MAX_CODE_LENGTH = 20000;
const MAX_INPUT_LENGTH = 5000;

async function run(req, res, next) {
  try {
    const { code, language } = req.body;
    const input = toStringValue(req.body.input);
    const studentId = req.user.id;
    const problemId = isBlank(req.body.problemId) ? undefined : String(req.body.problemId).trim();

    if (isBlank(code) || isBlank(language)) {
      throw createApiError(400, "code and language are required", "MISSING_FIELDS");
    }

    if (code.length > MAX_CODE_LENGTH) {
      throw createApiError(413, `code must be ${MAX_CODE_LENGTH} characters or less`, "CODE_TOO_LARGE");
    }

    if (input.length > MAX_INPUT_LENGTH) {
      throw createApiError(413, `input must be ${MAX_INPUT_LENGTH} characters or less`, "INPUT_TOO_LARGE");
    }

    const result = await runCode(language, code, input);
    await ActivityEvent.create({
      studentId,
      type: "run_clicked",
      severity: "info",
      message: "Code run through API",
      meta: {
        problemId,
        language,
        studentName: req.user.name,
        studentEmail: req.user.email
      }
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

async function submit(req, res, next) {
  try {
    const { code, language, problemId } = req.body;
    const studentId = req.user.id;

    if (isBlank(code) || isBlank(language) || isBlank(problemId)) {
      throw createApiError(400, "code, language and problemId are required", "MISSING_FIELDS");
    }

    if (code.length > MAX_CODE_LENGTH) {
      throw createApiError(413, `code must be ${MAX_CODE_LENGTH} characters or less`, "CODE_TOO_LARGE");
    }

    if (!isValidObjectId(problemId)) {
      throw createApiError(400, "problemId must be a valid MongoDB ObjectId", "INVALID_PROBLEM_ID");
    }

    const problem = await Problem.findById(problemId);
    if (!problem) {
      throw createApiError(404, "Problem not found", "PROBLEM_NOT_FOUND");
    }

    const evaluation = await evaluateSubmission({ code, language, problem });

    const submission = await Submission.create({
      studentId,
      problemId: problem._id,
      code,
      language,
      total: evaluation.total,
      passed: evaluation.passed,
      failed: evaluation.failed,
      details: evaluation.details
    });

    await ActivityEvent.create({
      studentId,
      type: "submit_clicked",
      severity: evaluation.failed > 0 ? "warning" : "info",
      message: evaluation.failed > 0 ? "Submission has failed test cases" : "Submission accepted",
      meta: {
        problemId,
        submissionId: submission._id,
        total: evaluation.total,
        passed: evaluation.passed,
        failed: evaluation.failed,
        studentName: req.user.name,
        studentEmail: req.user.email
      }
    });

    res.json({
      success: true,
      submissionId: submission._id,
      ...evaluation
    });
  } catch (error) {
    next(error);
  }
}

function languages(req, res) {
  res.json({
    success: true,
    languages: Object.entries(SUPPORTED_LANGUAGES).map(([name, id]) => ({ name, id }))
  });
}

module.exports = { languages, run, submit };

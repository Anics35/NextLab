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
    console.log("[run] req.body", req.body);
    const { code, language } = req.body;
    const input = toStringValue(req.body.input);
    const studentId = req.user.id;
    const problemId = isBlank(req.body.problemId) ? undefined : String(req.body.problemId).trim();
    console.log("RECEIVED CODE:", req.body.code);

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
    let publicEvaluation = null;

    if (problemId && isValidObjectId(problemId)) {
      const problem = await Problem.findById(problemId);
      if (problem && problem.problemType !== "design") {
        try {
          publicEvaluation = await evaluateSubmission({ code, language, problem, visibility: "public" });
        } catch (evaluationError) {
          publicEvaluation = {
            total: 0,
            passed: 0,
            failed: 0,
            passedPublic: 0,
            totalPublic: 0,
            passedHidden: 0,
            totalHidden: 0,
            details: [],
            error: evaluationError.message || "Unable to evaluate public test cases."
          };
        }
      }
    }
    console.log("INPUT:", input);
    console.log("OUTPUT:", result.output || result.error || "");
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
      ...result,
      ...(publicEvaluation
        ? {
            publicRun: publicEvaluation,
            passedPublic: publicEvaluation.passedPublic,
            totalPublic: publicEvaluation.totalPublic,
            details: publicEvaluation.details
          }
        : {})
    });
  } catch (error) {
    next(error);
  }
}

async function submit(req, res, next) {
  try {
    console.log("[submit] req.body", req.body);
    const { code, language, problemId, examId } = req.body;
    const input = toStringValue(req.body.input);
    const studentId = req.user.id;
    console.log("RECEIVED CODE:", req.body.code);

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

    const evaluation = await evaluateSubmission({ code, language, problem, visibility: "all" });
    const scoringPassed = evaluation.totalHidden > 0 ? evaluation.passedHidden : evaluation.passed;
    const scoringTotal = evaluation.totalHidden > 0 ? evaluation.totalHidden : evaluation.total;
    const score = problem.marks
      ? Number(((scoringPassed / Math.max(1, scoringTotal)) * Number(problem.marks)).toFixed(2))
      : 0;

    const testResults = evaluation.details.map((detail) => ({
      input: String(detail.input || ""),
      expected: String(detail.expectedOutput || ""),
      output: String(detail.actualOutput || detail.error || ""),
      passed: Boolean(detail.passed),
      isPublic: detail.visibility === "public",
      error: String(detail.error || "")
    }));

    let submission = await Submission.findOne({ userId: studentId, examId });
    if (!submission) {
      submission = await Submission.create({
        userId: studentId,
        examId,
        problems: []
      });
    }

    const newProblemData = {
      problemId: problem._id,
      code: req.body.code,
      language,
      input,
      output: evaluation.details[0]?.actualOutput || "",
      score,
      maxMarks: Number(problem.marks || 0),
      passed: evaluation.passed,
      total: evaluation.total,
      passedPublic: evaluation.passedPublic,
      totalPublic: evaluation.totalPublic,
      passedHidden: evaluation.passedHidden,
      totalHidden: evaluation.totalHidden,
      testResults,
      manualOverride: false,
      submittedAt: new Date()
    };

    const existingIndex = submission.problems.findIndex((item) => String(item.problemId) === String(problem._id));
    if (existingIndex !== -1) {
      submission.problems[existingIndex] = newProblemData;
    } else {
      submission.problems.push(newProblemData);
    }

    await submission.save();
    console.log("SUBMITTED PROBLEM ID:", String(problem._id));
    console.log("DB CODE:", newProblemData.code);
    console.log("SAVED PROBLEMS:", submission.problems.length);
    console.log("INPUT:", input);
    console.log("OUTPUT:", newProblemData.output || "");

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
      ...evaluation,
      score
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

const Problem = require("../models/Problem");
const Submission = require("../models/Submission");
const { evaluateSubmission } = require("./evaluator");
const { analyzeSubmission } = require("./aiAnalysisService");

function computeScore(passed, total, marks) {
  if (!total) {
    return 0;
  }

  return Number(((passed / total) * marks).toFixed(2));
}

async function evaluateExamAnswer({ attempt, exam, problemConfig, code, language, studentId }) {
  const problem = await Problem.findById(problemConfig.problemId);
  if (!problem) {
    const error = new Error("Problem not found");
    error.status = 404;
    error.code = "PROBLEM_NOT_FOUND";
    throw error;
  }

  const evaluation = await evaluateSubmission({ code, language, problem });
  const score = computeScore(evaluation.passed, evaluation.total, problemConfig.marks);
  const answer = {
    problemId: problem._id,
    code,
    language,
    passed: evaluation.passed,
    total: evaluation.total,
    marks: problemConfig.marks,
    score,
    finalScore: score,
    manualOverride: false,
    submittedAt: new Date(),
    details: evaluation.details
  };

  answer.aiAnalysis = await analyzeSubmission({ problem, answer });

  const submission = await Submission.create({
    studentId,
    problemId: problem._id,
    examId: exam._id,
    examAttemptId: attempt._id,
    code,
    language,
    total: evaluation.total,
    passed: evaluation.passed,
    failed: evaluation.failed,
    details: evaluation.details,
    marks: problemConfig.marks,
    score,
    finalScore: score,
    manualOverride: false,
    aiAnalysis: answer.aiAnalysis
  });

  return { answer, evaluation, submission };
}

function recalculateAttemptScore(attempt) {
  attempt.totalScore = attempt.answers.reduce((sum, answer) => sum + (answer.finalScore || answer.score || 0), 0);
  return attempt.totalScore;
}

module.exports = { computeScore, evaluateExamAnswer, recalculateAttemptScore };

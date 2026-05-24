const Problem = require("../models/Problem");
const Submission = require("../models/Submission");
const { computeScore, evaluateSubmission } = require("./evaluator");
const { analyzeSubmission } = require("./aiAnalysisService");

async function evaluateExamAnswer({ attempt, exam, problemConfig, code, language, studentId, input = "" }) {
  const problem = await Problem.findById(problemConfig.problemId);
  if (!problem) {
    const error = new Error("Problem not found");
    error.status = 404;
    error.code = "PROBLEM_NOT_FOUND";
    throw error;
  }

  // Handle design problems (no test cases required)
  if (problem.problemType === "design") {
    const answer = {
      problemId: problem._id,
      code,
      language,
      input: String(input || ""),
      output: "",
      passed: 0,
      total: 0,
      passedPublic: 0,
      totalPublic: 0,
      passedHidden: 0,
      totalHidden: 0,
      marks: problemConfig.marks,
      score: problemConfig.marks, // Award full marks for design problems
      finalScore: problemConfig.marks,
      manualOverride: false,
      submittedAt: new Date(),
      details: [],
      isDesignProblem: true
    };

    const testResults = [];

    let submission = await Submission.findOne({ userId: studentId, examId: exam._id });
    if (!submission) {
      submission = await Submission.create({
        userId: studentId,
        examId: exam._id,
        examAttemptId: attempt._id,
        problems: []
      });
    }

    const newProblemData = {
      problemId: problem._id,
      code,
      language,
      input: String(input || ""),
      output: "",
      score: problemConfig.marks,
      maxMarks: Number(problemConfig.marks || 0),
      passed: 0,
      total: 0,
      passedPublic: 0,
      totalPublic: 0,
      passedHidden: 0,
      totalHidden: 0,
      testResults: [],
      manualOverride: false,
      submittedAt: new Date(),
      isDesignProblem: true
    };

    const existingIndex = submission.problems.findIndex((item) => String(item.problemId) === String(problem._id));
    if (existingIndex !== -1) {
      submission.problems.set(existingIndex, newProblemData);
    } else {
      submission.problems.push(newProblemData);
    }

    submission.examAttemptId = attempt._id;
    await submission.save();

    return { 
      answer, 
      evaluation: {
        passed: 0,
        total: 0,
        passedPublic: 0,
        totalPublic: 0,
        passedHidden: 0,
        totalHidden: 0,
        details: [],
        isDesignProblem: true
      }, 
      submission 
    };
  }

  // Handle testcase problems with evaluation
  const evaluation = await evaluateSubmission({ code, language, problem, visibility: "all" });
  const score = computeScore(
    evaluation.totalHidden > 0 ? evaluation.passedHidden : evaluation.passed,
    evaluation.totalHidden > 0 ? evaluation.totalHidden : evaluation.total,
    problemConfig.marks
  );
  const answer = {
    problemId: problem._id,
    code,
    language,
    input: String(input || ""),
    output: evaluation.details[0]?.actualOutput || "",
    passed: evaluation.passed,
    total: evaluation.total,
    passedPublic: evaluation.passedPublic,
    totalPublic: evaluation.totalPublic,
    passedHidden: evaluation.passedHidden,
    totalHidden: evaluation.totalHidden,
    marks: problemConfig.marks,
    score,
    finalScore: score,
    manualOverride: false,
    submittedAt: new Date(),
    details: evaluation.details
  };

  answer.aiAnalysis = await analyzeSubmission({ problem, answer });

  const testResults = evaluation.details.map((detail) => ({
    input: String(detail.input || ""),
    expected: String(detail.expectedOutput || ""),
    output: String(detail.actualOutput || detail.error || ""),
    passed: Boolean(detail.passed),
    isPublic: detail.visibility === "public",
    error: String(detail.error || "")
  }));

  let submission = await Submission.findOne({ userId: studentId, examId: exam._id });
  if (!submission) {
    submission = await Submission.create({
      userId: studentId,
      examId: exam._id,
      examAttemptId: attempt._id,
      problems: []
    });
  }

  const newProblemData = {
    problemId: problem._id,
    code,
    language,
    input: String(input || ""),
    output: evaluation.details[0]?.actualOutput || "",
    score,
    maxMarks: Number(problemConfig.marks || 0),
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
    submission.problems.set(existingIndex, newProblemData);
  } else {
    submission.problems.push(newProblemData);
  }

  submission.examAttemptId = attempt._id;
  await submission.save();
  console.log("SUBMITTED PROBLEM ID:", String(problem._id));
  console.log("DB CODE:", code);
  console.log("SAVED PROBLEMS:", submission.problems.length);

  return { answer, evaluation, submission };
}

function recalculateAttemptScore(attempt) {
  attempt.totalScore = attempt.answers.reduce((sum, answer) => sum + (answer.finalScore || answer.score || 0), 0);
  return attempt.totalScore;
}

module.exports = { computeScore, evaluateExamAnswer, recalculateAttemptScore };

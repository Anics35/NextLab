const Course = require("../models/Course");
const Exam = require("../models/Exam");
const ExamAttempt = require("../models/ExamAttempt");
const Problem = require("../models/Problem");
const Submission = require("../models/Submission");
const { evaluateExamAnswer, recalculateAttemptScore } = require("../services/examEvaluationService");
const { createApiError } = require("../utils/apiError");
const { isBlank, isValidObjectId } = require("../utils/validators");

async function loadExamForStudent(examId, studentId) {
  if (!isValidObjectId(examId)) {
    throw createApiError(400, "examId must be a valid MongoDB ObjectId", "INVALID_EXAM_ID");
  }

  const exam = await Exam.findById(examId);
  if (!exam) {
    throw createApiError(404, "Exam not found", "EXAM_NOT_FOUND");
  }

  const course = await Course.findById(exam.courseId);
  if (!course || !course.students.some((id) => String(id) === studentId)) {
    throw createApiError(403, "Student is not enrolled in this exam course", "FORBIDDEN");
  }

  return { exam, course };
}

function assertExamOpen(exam) {
  const now = new Date();

  if (exam.status === "ended") {
    throw createApiError(403, "Exam time is over", "EXAM_ENDED");
  }

  if (exam.status !== "ongoing") {
    throw createApiError(403, "Exam has not started yet", "EXAM_NOT_STARTED");
  }

  if (now > exam.endTime) {
    throw createApiError(403, "Exam time is over", "EXAM_ENDED");
  }
}

function getRemainingTimeSeconds(exam) {
  return Math.max(0, Math.floor((new Date(exam.endTime).getTime() - Date.now()) / 1000));
}

function getProblemIndex(exam, problemId) {
  return exam.problems.findIndex((item) => String(item.problemId) === String(problemId));
}

function canRecoverAutoSubmittedAttempt(attempt, exam, problemIndex) {
  if (attempt.status !== "auto-submitted" || getRemainingTimeSeconds(exam) <= 0) {
    return false;
  }

  const answer = attempt.answers[problemIndex];
  return !answer || !answer.submittedAt || Number(answer.total || 0) === 0;
}

function serializeAnswerResult(answer, exam) {
  const details = Array.isArray(answer?.details) ? answer.details : [];

  return {
    passed: answer?.passed || 0,
    total: answer?.total || 0,
    failed: Math.max(0, (answer?.total || 0) - (answer?.passed || 0)),
    passedPublic: answer?.passedPublic || 0,
    totalPublic: answer?.totalPublic || 0,
    passedHidden: answer?.passedHidden || 0,
    totalHidden: answer?.totalHidden || 0,
    input: String(answer?.input || ""),
    output: String(answer?.output || ""),
    details,
    testResults: details.map((detail) => ({
      input: String(detail.input || ""),
      expected: String(detail.expectedOutput || detail.expected || ""),
      output: String(detail.actualOutput || detail.output || detail.error || ""),
      passed: Boolean(detail.passed),
      isPublic: detail.visibility === "public" || detail.isPublic === true,
      error: String(detail.error || "")
    })),
    score: answer?.score || 0,
    finalScore: answer?.finalScore ?? answer?.score ?? 0,
    isDesignProblem: Boolean(answer?.isDesignProblem),
    serverTime: new Date().toISOString(),
    remainingTime: exam ? getRemainingTimeSeconds(exam) : 0
  };
}

async function startAttempt(req, res, next) {
  try {
    const { examId } = req.body;
    const { exam } = await loadExamForStudent(examId, req.user.id);
    assertExamOpen(exam);

    let attempt = await ExamAttempt.findOne({ examId: exam._id, studentId: req.user.id });
    if (!attempt) {
      attempt = await ExamAttempt.create({
        examId: exam._id,
        studentId: req.user.id,
        startTime: new Date(),
        currentProblemIndex: 0,
        answers: exam.problems.map((item) => ({
          problemId: item.problemId,
          marks: item.marks
        }))
      });
    }

    res.status(201).json({
      success: true,
      attempt,
      exam,
      serverTime: new Date().toISOString(),
      remainingTime: getRemainingTimeSeconds(exam)
    });
  } catch (error) {
    next(error);
  }
}

async function saveAttempt(req, res, next) {
  try {
    const { examId, problemId, code = "", language = "", currentProblemIndex } = req.body;
    const { exam } = await loadExamForStudent(examId, req.user.id);
    assertExamOpen(exam);

    const attempt = await ExamAttempt.findOne({ examId, studentId: req.user.id });
    if (!attempt) {
      throw createApiError(404, "Exam attempt not started", "ATTEMPT_NOT_FOUND");
    }

    const problemIndex = getProblemIndex(exam, problemId);
    if (problemIndex === -1) {
      throw createApiError(400, "Problem is not part of this exam", "PROBLEM_NOT_IN_EXAM");
    }

    if (attempt.status !== "ongoing") {
      if (canRecoverAutoSubmittedAttempt(attempt, exam, problemIndex)) {
        attempt.status = "ongoing";
        attempt.endTime = undefined;
      } else {
        return res.json({
          success: true,
          attempt,
          saved: false,
          closed: true,
          serverTime: new Date().toISOString(),
          remainingTime: getRemainingTimeSeconds(exam)
        });
      }
    }

    if (exam.navigationControl === false && problemIndex > attempt.currentProblemIndex) {
      throw createApiError(403, "Sequential navigation is enforced", "NAVIGATION_LOCKED");
    }

    attempt.answers[problemIndex].code = String(code);
    attempt.answers[problemIndex].language = String(language);
    attempt.currentProblemIndex = Number.isInteger(currentProblemIndex)
      ? currentProblemIndex
      : Math.max(attempt.currentProblemIndex, problemIndex);
    await attempt.save();

    res.json({
      success: true,
      attempt,
      serverTime: new Date().toISOString(),
      remainingTime: getRemainingTimeSeconds(exam)
    });
  } catch (error) {
    next(error);
  }
}

async function submitAttempt(req, res, next) {
  try {
    const { examId, problemId, code, language, input = "", finalSubmit = false } = req.body;
    console.log("RECEIVED CODE:", req.body.code);
    const { exam } = await loadExamForStudent(examId, req.user.id);
    assertExamOpen(exam);

    if (isBlank(problemId) || isBlank(code) || isBlank(language)) {
      throw createApiError(400, "examId, problemId, code and language are required", "MISSING_FIELDS");
    }

    const attempt = await ExamAttempt.findOne({ examId, studentId: req.user.id });
    if (!attempt) {
      throw createApiError(404, "Exam attempt not started", "ATTEMPT_NOT_FOUND");
    }

    const problemIndex = getProblemIndex(exam, problemId);
    if (problemIndex === -1) {
      throw createApiError(400, "Problem is not part of this exam", "PROBLEM_NOT_IN_EXAM");
    }

    if (attempt.status !== "ongoing") {
      const existingAnswer = attempt.answers[problemIndex];
      if (canRecoverAutoSubmittedAttempt(attempt, exam, problemIndex)) {
        attempt.status = "ongoing";
        attempt.endTime = undefined;
      } else {
        return res.json({
          success: true,
          attempt,
          submissionId: null,
          closed: true,
          ...serializeAnswerResult(existingAnswer, exam)
        });
      }
    }

    if (exam.navigationControl === false && problemIndex > attempt.currentProblemIndex) {
      throw createApiError(403, "Sequential navigation is enforced", "NAVIGATION_LOCKED");
    }

    const { answer, evaluation, submission } = await evaluateExamAnswer({
      attempt,
      exam,
      problemConfig: exam.problems[problemIndex],
      code,
      language,
      studentId: req.user.id,
      input
    });

    attempt.answers.set(problemIndex, answer);
    attempt.currentProblemIndex = Math.max(attempt.currentProblemIndex, problemIndex + 1);

    if (finalSubmit) {
      attempt.status = "submitted";
      attempt.endTime = new Date();
    }

    recalculateAttemptScore(attempt);
    await attempt.save();

    res.json({
      success: true,
      attempt,
      submissionId: submission._id,
      ...evaluation,
      input: String(input || ""),
      output: answer.output || "",
      details: evaluation.details,
      testResults: evaluation.details.map((detail) => ({
        input: String(detail.input || ""),
        expected: String(detail.expectedOutput || ""),
        output: String(detail.actualOutput || detail.error || ""),
        passed: Boolean(detail.passed),
        isPublic: detail.visibility === "public",
        error: String(detail.error || "")
      })),
      score: answer.score,
      finalScore: answer.finalScore,
      serverTime: new Date().toISOString(),
      remainingTime: getRemainingTimeSeconds(exam)
    });
  } catch (error) {
    next(error);
  }
}

async function finalizeAttempt(req, res, next) {
  try {
    const { examId } = req.body;
    const attempt = await ExamAttempt.findOne({ examId, studentId: req.user.id });

    if (!attempt) {
      throw createApiError(404, "Exam attempt not found", "ATTEMPT_NOT_FOUND");
    }

    if (attempt.status === "ongoing") {
      attempt.status = "submitted";
      attempt.endTime = new Date();
      recalculateAttemptScore(attempt);
      await attempt.save();
    }

    res.json({ success: true, attempt, serverTime: new Date().toISOString(), remainingTime: 0 });
  } catch (error) {
    next(error);
  }
}

async function getMyAttempt(req, res, next) {
  try {
    const attempt = await ExamAttempt.findOne({ examId: req.params.examId, studentId: req.user.id });
    const exam = await Exam.findById(req.params.examId);
    res.json({
      success: true,
      attempt,
      serverTime: new Date().toISOString(),
      remainingTime: exam ? getRemainingTimeSeconds(exam) : 0
    });
  } catch (error) {
    next(error);
  }
}

async function getStudentAttempt(req, res, next) {
  try {
    const { examId, studentId } = req.params;
    const attempt = await ExamAttempt.findOne({ examId, studentId }).populate("studentId", "name email");
    res.json({ success: true, attempt });
  } catch (error) {
    next(error);
  }
}

async function overrideScore(req, res, next) {
  try {
    const { attemptId } = req.params;
    const { problemId, finalScore } = req.body;

    if (!isValidObjectId(attemptId) || !isValidObjectId(problemId) || finalScore === undefined) {
      throw createApiError(400, "attemptId, problemId and finalScore are required", "MISSING_FIELDS");
    }

    const attempt = await ExamAttempt.findById(attemptId).populate("examId");
    if (!attempt) {
      throw createApiError(404, "Exam attempt not found", "ATTEMPT_NOT_FOUND");
    }

    const course = await Course.findById(attempt.examId.courseId);
    if (!course || String(course.teacherId) !== req.user.id) {
      throw createApiError(403, "Only the course teacher can override score", "FORBIDDEN");
    }

    const answer = attempt.answers.find((item) => String(item.problemId) === String(problemId));
    if (!answer) {
      throw createApiError(404, "Problem answer not found", "ANSWER_NOT_FOUND");
    }

    answer.finalScore = Number(finalScore);
    answer.manualOverride = true;
    recalculateAttemptScore(attempt);
    await attempt.save();

    const submission = await Submission.findOne({ examAttemptId: attempt._id });
    if (submission) {
      const submissionProblem = submission.problems.find((item) => String(item.problemId) === String(problemId));
      if (submissionProblem) {
        submissionProblem.score = Number(finalScore);
        submissionProblem.manualOverride = true;
        await submission.save();
      }
    }

    res.json({ success: true, attempt });
  } catch (error) {
    next(error);
  }
}

async function listAttemptProblems(req, res, next) {
  try {
    const attempt = await ExamAttempt.findById(req.params.attemptId).populate("examId");
    if (!attempt) {
      throw createApiError(404, "Exam attempt not found", "ATTEMPT_NOT_FOUND");
    }

    const problemIds = attempt.examId.problems.map((item) => item.problemId);
    const problems = await Problem.find({ _id: { $in: problemIds } });
    res.json({ success: true, problems });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  finalizeAttempt,
  getMyAttempt,
  getStudentAttempt,
  listAttemptProblems,
  overrideScore,
  saveAttempt,
  startAttempt,
  submitAttempt
};

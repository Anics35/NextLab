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
  if (now < exam.startTime) {
    throw createApiError(403, "Exam has not started yet", "EXAM_NOT_STARTED");
  }

  if (now > exam.endTime) {
    throw createApiError(403, "Exam time is over", "EXAM_ENDED");
  }
}

function getProblemIndex(exam, problemId) {
  return exam.problems.findIndex((item) => String(item.problemId) === String(problemId));
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

    res.status(201).json({ success: true, attempt, exam });
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

    if (attempt.status !== "ongoing") {
      throw createApiError(409, "Exam attempt is already submitted", "ATTEMPT_CLOSED");
    }

    const problemIndex = getProblemIndex(exam, problemId);
    if (problemIndex === -1) {
      throw createApiError(400, "Problem is not part of this exam", "PROBLEM_NOT_IN_EXAM");
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

    res.json({ success: true, attempt });
  } catch (error) {
    next(error);
  }
}

async function submitAttempt(req, res, next) {
  try {
    const { examId, problemId, code, language, finalSubmit = false } = req.body;
    const { exam } = await loadExamForStudent(examId, req.user.id);
    assertExamOpen(exam);

    if (isBlank(problemId) || isBlank(code) || isBlank(language)) {
      throw createApiError(400, "examId, problemId, code and language are required", "MISSING_FIELDS");
    }

    const attempt = await ExamAttempt.findOne({ examId, studentId: req.user.id });
    if (!attempt) {
      throw createApiError(404, "Exam attempt not started", "ATTEMPT_NOT_FOUND");
    }

    if (attempt.status !== "ongoing") {
      throw createApiError(409, "Exam attempt is already submitted", "ATTEMPT_CLOSED");
    }

    const problemIndex = getProblemIndex(exam, problemId);
    if (problemIndex === -1) {
      throw createApiError(400, "Problem is not part of this exam", "PROBLEM_NOT_IN_EXAM");
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
      studentId: req.user.id
    });

    attempt.answers[problemIndex] = answer;
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
      score: answer.score,
      finalScore: answer.finalScore
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

    res.json({ success: true, attempt });
  } catch (error) {
    next(error);
  }
}

async function getMyAttempt(req, res, next) {
  try {
    const attempt = await ExamAttempt.findOne({ examId: req.params.examId, studentId: req.user.id });
    res.json({ success: true, attempt });
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

    await Submission.updateMany(
      { examAttemptId: attempt._id, problemId },
      { finalScore: Number(finalScore), manualOverride: true }
    );

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

const Exam = require("../models/Exam");
const ExamAttempt = require("../models/ExamAttempt");
const { createApiError } = require("../utils/apiError");
const { isValidObjectId } = require("../utils/validators");

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

async function getExamAnalytics(req, res, next) {
  try {
    const { examId } = req.params;
    const { semester, dateFrom, dateTo } = req.query;

    if (!isValidObjectId(examId)) {
      throw createApiError(400, "examId must be a valid MongoDB ObjectId", "INVALID_EXAM_ID");
    }

    const exam = await Exam.findById(examId).populate("problems.problemId", "title difficulty");
    if (!exam) {
      throw createApiError(404, "Exam not found", "EXAM_NOT_FOUND");
    }

    const attempts = await ExamAttempt.find({ examId })
      .populate("studentId", "name email rollNumber semester")
      .sort({ updatedAt: -1 });

    const filteredAttempts = attempts.filter((attempt) => {
      if (semester && String(attempt.studentId?.semester || "") !== String(semester)) {
        return false;
      }

      if (dateFrom && new Date(attempt.updatedAt) < new Date(dateFrom)) {
        return false;
      }

      if (dateTo && new Date(attempt.updatedAt) > new Date(dateTo)) {
        return false;
      }

      return true;
    });

    const scores = filteredAttempts.map((attempt) => attempt.totalScore || 0);
    const problemStats = exam.problems.map((examProblem) => {
      let passed = 0;
      let total = 0;

      filteredAttempts.forEach((attempt) => {
        const answer = attempt.answers.find((item) => String(item.problemId) === String(examProblem.problemId._id || examProblem.problemId));
        if (answer && answer.total > 0) {
          total += 1;
          if (answer.passed === answer.total) {
            passed += 1;
          }
        }
      });

      return {
        problemId: examProblem.problemId,
        marks: examProblem.marks,
        attempts: total,
        accepted: passed,
        successRate: total ? Number(((passed / total) * 100).toFixed(2)) : 0
      };
    });

    res.json({
      success: true,
      analytics: {
        examId,
        attempts: filteredAttempts.length,
        averageScore: average(scores),
        highestScore: scores.length ? Math.max(...scores) : 0,
        lowestScore: scores.length ? Math.min(...scores) : 0,
        students: filteredAttempts.map((attempt) => ({
          student: attempt.studentId,
          status: attempt.status,
          score: attempt.totalScore || 0,
          violations: attempt.violations.length,
          tabSwitchCount: attempt.tabSwitchCount
        })),
        problemStats
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getExamAnalytics };

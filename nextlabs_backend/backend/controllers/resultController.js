const Course = require("../models/Course");
const Exam = require("../models/Exam");
const ExamAttempt = require("../models/ExamAttempt");
const User = require("../models/User");
const { buildResultPdf } = require("../services/pdfService");
const { createApiError } = require("../utils/apiError");
const { isValidObjectId } = require("../utils/validators");

async function downloadResultPdf(req, res, next) {
  try {
    const { examId, studentId } = req.params;

    if (!isValidObjectId(examId) || !isValidObjectId(studentId)) {
      throw createApiError(400, "examId and studentId must be valid ids", "INVALID_ID");
    }

    const [exam, student, attempt] = await Promise.all([
      Exam.findById(examId),
      User.findById(studentId).select("-passwordHash"),
      ExamAttempt.findOne({ examId, studentId }).populate("answers.problemId", "title")
    ]);

    if (!exam || !student || !attempt) {
      throw createApiError(404, "Result not found", "RESULT_NOT_FOUND");
    }

    const course = await Course.findById(exam.courseId);
    const isTeacher = course && String(course.teacherId) === req.user.id;
    const isSelf = req.user.id === studentId;
    if (!isTeacher && !isSelf) {
      throw createApiError(403, "You cannot access this result", "FORBIDDEN");
    }

    const pdf = await buildResultPdf({ student, exam, attempt });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="nextlab-${examId}-${studentId}.pdf"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
}

module.exports = { downloadResultPdf };

const Course = require("../models/Course");
const Exam = require("../models/Exam");
const Problem = require("../models/Problem");
const { createApiError } = require("../utils/apiError");
const { isBlank, isValidObjectId } = require("../utils/validators");

async function assertTeacherOwnsCourse(courseId, teacherId) {
  if (!isValidObjectId(courseId)) {
    throw createApiError(400, "courseId must be a valid MongoDB ObjectId", "INVALID_COURSE_ID");
  }

  const course = await Course.findById(courseId);
  if (!course) {
    throw createApiError(404, "Course not found", "COURSE_NOT_FOUND");
  }

  if (String(course.teacherId) !== teacherId) {
    throw createApiError(403, "Only the course teacher can manage exams", "FORBIDDEN");
  }

  return course;
}

async function createExam(req, res, next) {
  try {
    const {
      title,
      courseId,
      problems = [],
      timerType = "global",
      totalDuration,
      navigationControl = true,
      startTime,
      endTime
    } = req.body;

    if (isBlank(title) || isBlank(courseId) || !Array.isArray(problems) || problems.length === 0 || !totalDuration) {
      throw createApiError(400, "title, courseId, problems and totalDuration are required", "MISSING_FIELDS");
    }

    if (!["global", "per-problem"].includes(timerType)) {
      throw createApiError(400, "timerType must be global or per-problem", "INVALID_TIMER_TYPE");
    }

    await assertTeacherOwnsCourse(courseId, req.user.id);

    const cleanedProblems = [];
    for (const item of problems) {
      if (!isValidObjectId(item.problemId)) {
        throw createApiError(400, "Each problemId must be valid", "INVALID_PROBLEM_ID");
      }

      const exists = await Problem.exists({ _id: item.problemId });
      if (!exists) {
        throw createApiError(404, `Problem not found: ${item.problemId}`, "PROBLEM_NOT_FOUND");
      }

      cleanedProblems.push({
        problemId: item.problemId,
        marks: Number(item.marks || 0),
        individualTimeLimit: item.individualTimeLimit ? Number(item.individualTimeLimit) : undefined
      });
    }

    const start = startTime ? new Date(startTime) : new Date();
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + Number(totalDuration) * 60 * 1000);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw createApiError(400, "startTime/endTime are invalid", "INVALID_EXAM_TIME");
    }

    const exam = await Exam.create({
      title: title.trim(),
      courseId,
      problems: cleanedProblems,
      timerType,
      totalDuration: Number(totalDuration),
      navigationControl: Boolean(navigationControl),
      startTime: start,
      endTime: end,
      createdBy: req.user.id
    });

    res.status(201).json({ success: true, exam });
  } catch (error) {
    next(error);
  }
}

async function listCourseExams(req, res, next) {
  try {
    const { courseId } = req.params;

    if (!isValidObjectId(courseId)) {
      throw createApiError(400, "courseId must be a valid MongoDB ObjectId", "INVALID_COURSE_ID");
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw createApiError(404, "Course not found", "COURSE_NOT_FOUND");
    }

    const isTeacher = String(course.teacherId) === req.user.id;
    const isStudent = course.students.some((studentId) => String(studentId) === req.user.id);
    if (!isTeacher && !isStudent) {
      throw createApiError(403, "You are not part of this course", "FORBIDDEN");
    }

    const exams = await Exam.find({ courseId })
      .populate("problems.problemId", "title difficulty")
      .sort({ startTime: -1 });

    res.json({ success: true, count: exams.length, exams });
  } catch (error) {
    next(error);
  }
}

async function getExam(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      throw createApiError(400, "Exam id must be a valid MongoDB ObjectId", "INVALID_EXAM_ID");
    }

    const exam = await Exam.findById(id).populate("problems.problemId", "title description difficulty testCases");
    if (!exam) {
      throw createApiError(404, "Exam not found", "EXAM_NOT_FOUND");
    }

    res.json({ success: true, exam });
  } catch (error) {
    next(error);
  }
}

async function updateExam(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      throw createApiError(400, "Exam id must be a valid MongoDB ObjectId", "INVALID_EXAM_ID");
    }

    const exam = await Exam.findById(id);
    if (!exam) {
      throw createApiError(404, "Exam not found", "EXAM_NOT_FOUND");
    }

    await assertTeacherOwnsCourse(exam.courseId, req.user.id);

    const allowed = ["title", "totalDuration", "navigationControl", "startTime", "endTime"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        exam[key] = req.body[key];
      }
    }

    await exam.save();
    res.json({ success: true, exam });
  } catch (error) {
    next(error);
  }
}

module.exports = { createExam, getExam, listCourseExams, updateExam };

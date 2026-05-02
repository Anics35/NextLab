const Course = require("../models/Course");
const Exam = require("../models/Exam");
const Problem = require("../models/Problem");
const { createApiError } = require("../utils/apiError");
const { isBlank, isValidObjectId } = require("../utils/validators");

function resolveExamStatus(exam) {
  const now = Date.now();
  const start = new Date(exam.startTime).getTime();
  const end = new Date(exam.endTime).getTime();

  if (exam.status === "draft") {
    return "draft";
  }

  if (now < start) {
    return "published";
  }

  if (now >= start && now <= end) {
    return "ongoing";
  }

  return "ended";
}

function serializeExam(exam) {
  const status = resolveExamStatus(exam);
  if (exam.status !== status) {
    exam.status = status;
  }

  const data = exam.toObject ? exam.toObject() : exam;
  data.status = status;
  data.serverTime = new Date().toISOString();
  data.totalDuration = data.duration || (data.problems || []).reduce((sum, item) => sum + Number(item.duration || 0), 0);
  data.remainingTime = Math.max(0, Math.floor((new Date(data.endTime).getTime() - Date.now()) / 1000));
  return data;
}

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
      instructions = "",
      courseId,
      problems = [],
      timerType = "global",
      duration,
      totalDuration,
      navigationControl = true,
      startTime,
      endTime
    } = req.body;
    console.log("[createExam] req.body", req.body);
    const normalizedTimerType = timerType === "per-problem" ? "per_problem" : timerType;
    const globalDuration = Number(duration ?? totalDuration ?? 0);

    if (isBlank(title) || isBlank(courseId) || !Array.isArray(problems) || problems.length === 0) {
      throw createApiError(400, "title, courseId and problems are required", "MISSING_FIELDS");
    }

    if (!["global", "per_problem"].includes(normalizedTimerType)) {
      throw createApiError(400, "timerType must be global or per_problem", "INVALID_TIMER_TYPE");
    }
    if (normalizedTimerType === "global" && (!Number.isFinite(globalDuration) || globalDuration <= 0)) {
      throw createApiError(400, "duration is required when timerType is global", "INVALID_DURATION");
    }

    await assertTeacherOwnsCourse(courseId, req.user.id);

    const cleanedProblems = [];
    for (const item of problems) {
      if (!isValidObjectId(item.problemId)) {
        throw createApiError(400, "Each problemId must be valid", "INVALID_PROBLEM_ID");
      }

      const marks = Number(item.marks);
      if (!Number.isFinite(marks) || marks <= 0) {
        throw createApiError(400, "Each problem must include marks greater than 0", "INVALID_MARKS");
      }

      const exists = await Problem.exists({ _id: item.problemId });
      if (!exists) {
        throw createApiError(404, `Problem not found: ${item.problemId}`, "PROBLEM_NOT_FOUND");
      }

      cleanedProblems.push({
        problemId: item.problemId,
        marks,
        duration: normalizedTimerType === "per_problem"
          ? Number(item.duration || 0) || undefined
          : undefined
      });
    }
    if (normalizedTimerType === "per_problem" && cleanedProblems.some((item) => !Number.isFinite(item.duration) || item.duration <= 0)) {
      throw createApiError(400, "Each problem must include duration when timerType is per_problem", "INVALID_PROBLEM_DURATION");
    }

    const start = startTime ? new Date(startTime) : new Date();
    const fallbackDuration = normalizedTimerType === "global"
      ? globalDuration
      : cleanedProblems.reduce((sum, item) => sum + Number(item.duration || 0), 0);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + Number(fallbackDuration) * 60 * 1000);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw createApiError(400, "startTime/endTime are invalid", "INVALID_EXAM_TIME");
    }

    const exam = await Exam.create({
      title: title.trim(),
      instructions: String(instructions || "").trim(),
      courseId,
      problems: cleanedProblems,
      timerType: normalizedTimerType,
      duration: normalizedTimerType === "global" ? globalDuration : undefined,
      navigationControl: Boolean(navigationControl),
      startTime: start,
      endTime: end,
      status: "published",
      createdBy: req.user.id
    });

    res.status(201).json({ success: true, exam: serializeExam(exam) });
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

    res.json({
      success: true,
      count: exams.length,
      serverTime: new Date().toISOString(),
      exams: exams.map((exam) => serializeExam(exam))
    });
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

    const exam = await Exam.findById(id).populate("problems.problemId", "title description difficulty publicTestCases hiddenTestCases testCases");
    if (!exam) {
      throw createApiError(404, "Exam not found", "EXAM_NOT_FOUND");
    }

    const payload = serializeExam(exam);
    if (req.user?.role === "student") {
      payload.problems = (payload.problems || []).map((item) => ({
        ...item,
        problemId: item.problemId
          ? {
              ...item.problemId,
              hiddenTestCases: [],
              publicTestCases: item.problemId.publicTestCases?.length
                ? item.problemId.publicTestCases
                : (item.problemId.testCases || []).filter((testCase) => testCase.isPublic).map((testCase) => ({
                    input: testCase.input,
                    output: testCase.output || testCase.expectedOutput
                  }))
            }
          : item.problemId
      }));
    }
    res.json({ success: true, serverTime: new Date().toISOString(), exam: payload });
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

    const finalizeOnly = ["marksFinalized", "showResultsImmediately", "resultVisibility", "resultsVisible"];
    const editAllowed = ["title", "instructions", "totalDuration", "navigationControl", "startTime", "endTime", "timerType"];
    const requestedKeys = Object.keys(req.body || {});
    const isFinalizeRequest = requestedKeys.length > 0 && requestedKeys.every((key) => finalizeOnly.includes(key));

    if (exam.status !== "draft" && !isFinalizeRequest) {
      throw createApiError(409, "Published exams cannot be edited", "EXAM_LOCKED");
    }

    const allowed = exam.status === "draft" ? [...editAllowed, ...finalizeOnly] : finalizeOnly;
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        exam[key] = req.body[key];
      }
    }

    await exam.save();
    res.json({ success: true, exam: serializeExam(exam) });
  } catch (error) {
    next(error);
  }
}

module.exports = { createExam, getExam, listCourseExams, updateExam };

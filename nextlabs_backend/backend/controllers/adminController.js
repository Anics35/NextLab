const ActivityEvent = require("../models/ActivityEvent");
const Course = require("../models/Course");
const Exam = require("../models/Exam");
const ExamAttempt = require("../models/ExamAttempt");
const Submission = require("../models/Submission");
const User = require("../models/User");
const { createApiError } = require("../utils/apiError");
const { isValidObjectId } = require("../utils/validators");

function requireObjectId(id, label, code) {
  if (!isValidObjectId(id)) {
    throw createApiError(400, `${label} must be a valid MongoDB ObjectId`, code);
  }
}

async function deleteCoursesWithRelatedData(courseIds) {
  if (!courseIds.length) return;

  const exams = await Exam.find({ courseId: { $in: courseIds } }).select("_id");
  const examIds = exams.map((exam) => exam._id);

  if (examIds.length > 0) {
    await ExamAttempt.deleteMany({ examId: { $in: examIds } });
    await Submission.deleteMany({ examId: { $in: examIds } });
    await Exam.deleteMany({ _id: { $in: examIds } });
  }

  await Course.deleteMany({ _id: { $in: courseIds } });
}

async function getSummary(req, res, next) {
  try {
    const [users, courses, exams, attempts, submissions, warnings] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Exam.countDocuments(),
      ExamAttempt.countDocuments(),
      Submission.countDocuments(),
      ActivityEvent.countDocuments({ severity: "warning" })
    ]);

    res.json({ success: true, summary: { users, courses, exams, attempts, submissions, warnings } });
  } catch (error) {
    next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 200, 500));

    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    requireObjectId(id, "User id", "INVALID_USER_ID");

    const user = await User.findById(id);
    if (!user) {
      throw createApiError(404, "User not found", "USER_NOT_FOUND");
    }
    if (user.role === "admin") {
      throw createApiError(403, "Admin accounts cannot be deleted from the dashboard", "ADMIN_PROTECTED");
    }

    if (user.role === "student") {
      await Promise.all([
        Course.updateMany({ students: user._id }, { $pull: { students: user._id } }),
        Exam.updateMany({ visibleToStudents: user._id }, { $pull: { visibleToStudents: user._id } }),
        ExamAttempt.deleteMany({ studentId: user._id }),
        Submission.deleteMany({ userId: user._id }),
        ActivityEvent.deleteMany({ studentId: String(user._id) })
      ]);
    }

    if (user.role === "teacher") {
      await Course.updateMany(
        { teacherId: user._id },
        { $set: { teacherId: null, archived: true } }
      );
    }

    await User.findByIdAndDelete(user._id);
    res.json({ success: true, message: `${user.role} deleted` });
  } catch (error) {
    next(error);
  }
}

async function getUserActivity(req, res, next) {
  try {
    const { id } = req.params;
    requireObjectId(id, "User id", "INVALID_USER_ID");

    const user = await User.findById(id).select("-passwordHash");
    if (!user) {
      throw createApiError(404, "User not found", "USER_NOT_FOUND");
    }

    const [events, attempts, submissions] = await Promise.all([
      ActivityEvent.find({ studentId: String(user._id) }).sort({ createdAt: -1 }).limit(100),
      ExamAttempt.find({ studentId: user._id }).populate("examId", "title status").sort({ updatedAt: -1 }).limit(100),
      Submission.find({ userId: user._id }).populate("examId", "title status").sort({ updatedAt: -1 }).limit(100)
    ]);

    res.json({ success: true, user, activity: { events, attempts, submissions } });
  } catch (error) {
    next(error);
  }
}

async function setUserDisabled(req, res, next) {
  try {
    const { id } = req.params;
    requireObjectId(id, "User id", "INVALID_USER_ID");

    const disabled = req.body.disabled !== false;
    const user = await User.findById(id);
    if (!user) {
      throw createApiError(404, "User not found", "USER_NOT_FOUND");
    }
    if (user.role === "admin") {
      throw createApiError(403, "Admin accounts cannot be disabled", "ADMIN_PROTECTED");
    }

    user.disabled = disabled;
    await user.save();
    const payload = user.toObject();
    delete payload.passwordHash;

    res.json({ success: true, user: payload });
  } catch (error) {
    next(error);
  }
}

async function listCourses(req, res, next) {
  try {
    const courses = await Course.find()
      .populate("teacherId", "name email role")
      .populate("students", "name email role rollNumber semester disabled")
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 200, 500));

    res.json({ success: true, count: courses.length, courses });
  } catch (error) {
    next(error);
  }
}

async function deleteCourse(req, res, next) {
  try {
    const { id } = req.params;
    requireObjectId(id, "Course id", "INVALID_COURSE_ID");

    const course = await Course.findById(id);
    if (!course) {
      throw createApiError(404, "Course not found", "COURSE_NOT_FOUND");
    }

    await deleteCoursesWithRelatedData([course._id]);
    res.json({ success: true, message: "Course deleted" });
  } catch (error) {
    next(error);
  }
}

async function setCourseArchived(req, res, next) {
  try {
    const { id } = req.params;
    requireObjectId(id, "Course id", "INVALID_COURSE_ID");

    const course = await Course.findByIdAndUpdate(
      id,
      { archived: req.body.archived !== false },
      { new: true }
    ).populate("teacherId", "name email role");

    if (!course) {
      throw createApiError(404, "Course not found", "COURSE_NOT_FOUND");
    }

    res.json({ success: true, course });
  } catch (error) {
    next(error);
  }
}

async function listExams(req, res, next) {
  try {
    const exams = await Exam.find()
      .populate("courseId", "title courseCode")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 200, 500));

    res.json({ success: true, count: exams.length, exams });
  } catch (error) {
    next(error);
  }
}

async function deleteExam(req, res, next) {
  try {
    const { id } = req.params;
    requireObjectId(id, "Exam id", "INVALID_EXAM_ID");

    const exam = await Exam.findById(id);
    if (!exam) {
      throw createApiError(404, "Exam not found", "EXAM_NOT_FOUND");
    }

    await Promise.all([
      ExamAttempt.deleteMany({ examId: exam._id }),
      Submission.deleteMany({ examId: exam._id })
    ]);
    await Exam.findByIdAndDelete(exam._id);

    res.json({ success: true, message: "Exam deleted" });
  } catch (error) {
    next(error);
  }
}

async function setExamHidden(req, res, next) {
  try {
    const { id } = req.params;
    requireObjectId(id, "Exam id", "INVALID_EXAM_ID");

    const exam = await Exam.findByIdAndUpdate(
      id,
      { hidden: req.body.hidden !== false },
      { new: true }
    ).populate("courseId", "title courseCode");

    if (!exam) {
      throw createApiError(404, "Exam not found", "EXAM_NOT_FOUND");
    }

    res.json({ success: true, exam });
  } catch (error) {
    next(error);
  }
}

async function getAnalytics(req, res, next) {
  try {
    const [students, teachers, disabledUsers, archivedCourses, hiddenExams, activeAttempts] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "teacher" }),
      User.countDocuments({ disabled: true }),
      Course.countDocuments({ archived: true }),
      Exam.countDocuments({ hidden: true }),
      ExamAttempt.countDocuments({ status: "ongoing" })
    ]);

    res.json({
      success: true,
      analytics: { students, teachers, disabledUsers, archivedCourses, hiddenExams, activeAttempts }
    });
  } catch (error) {
    next(error);
  }
}

async function getProctorLogs(req, res, next) {
  try {
    const events = await ActivityEvent.find({ severity: "warning" })
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 200, 500));

    res.json({ success: true, count: events.length, events });
  } catch (error) {
    next(error);
  }
}

async function getActivityLogs(req, res, next) {
  try {
    const events = await ActivityEvent.find()
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 200, 500));

    res.json({ success: true, count: events.length, events });
  } catch (error) {
    next(error);
  }
}

async function getSubmissions(req, res, next) {
  try {
    const submissions = await Submission.find()
      .populate("userId", "name email rollNumber semester")
      .populate("examId", "title status")
      .sort({ updatedAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 200, 500));

    res.json({ success: true, count: submissions.length, submissions });
  } catch (error) {
    next(error);
  }
}

async function getReports(req, res, next) {
  try {
    const [latestExams, latestCourses, latestWarnings] = await Promise.all([
      Exam.find().populate("courseId", "title courseCode").sort({ createdAt: -1 }).limit(5),
      Course.find().populate("teacherId", "name email").sort({ createdAt: -1 }).limit(5),
      ActivityEvent.find({ severity: "warning" }).sort({ createdAt: -1 }).limit(5)
    ]);

    res.json({ success: true, reports: { latestExams, latestCourses, latestWarnings } });
  } catch (error) {
    next(error);
  }
}

async function downloadReports(req, res, next) {
  try {
    const [users, courses, exams, attempts, submissions, warnings] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Exam.countDocuments(),
      ExamAttempt.countDocuments(),
      Submission.countDocuments(),
      ActivityEvent.countDocuments({ severity: "warning" })
    ]);

    const rows = [
      ["metric", "count"],
      ["users", users],
      ["courses", courses],
      ["exams", exams],
      ["attempts", attempts],
      ["submissions", submissions],
      ["warnings", warnings]
    ];

    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=\"nexlab-admin-report.csv\"");
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  deleteCourse,
  deleteExam,
  deleteUser,
  downloadReports,
  getActivityLogs,
  getAnalytics,
  getProctorLogs,
  getReports,
  getSummary,
  getSubmissions,
  getUserActivity,
  listCourses,
  listExams,
  listUsers,
  setCourseArchived,
  setExamHidden,
  setUserDisabled
};

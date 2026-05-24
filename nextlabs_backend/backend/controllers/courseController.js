const crypto = require("crypto");
const Course = require("../models/Course");
const { createApiError } = require("../utils/apiError");
const { isBlank, isValidObjectId } = require("../utils/validators");

function normalizeCourseCode(courseCode) {
  return String(courseCode || "").trim().toUpperCase();
}

async function generateInviteCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = crypto.randomBytes(3).toString("hex").toUpperCase();
    const exists = await Course.exists({ inviteCode });
    if (!exists) {
      return inviteCode;
    }
  }

  throw createApiError(500, "Could not generate invite code", "INVITE_CODE_FAILED");
}

async function createCourse(req, res, next) {
  try {
    const { title, description = "", courseCode, year, semester } = req.body;
    const normalizedCourseCode = normalizeCourseCode(courseCode);

    if (isBlank(title) || isBlank(normalizedCourseCode) || !year || !semester) {
      throw createApiError(400, "title, courseCode, year, and semester are required", "MISSING_FIELDS");
    }

    if (!/^[A-Z0-9_-]{4,20}$/.test(normalizedCourseCode)) {
      throw createApiError(
        400,
        "courseCode must be 4-20 characters and can contain letters, numbers, underscore or hyphen",
        "INVALID_COURSE_CODE"
      );
    }

    if (typeof year !== "number" || year < 2000 || year > 2100) {
      throw createApiError(400, "year must be a number between 2000 and 2100", "INVALID_YEAR");
    }

    if (typeof semester !== "number" || semester < 1 || semester > 8) {
      throw createApiError(400, "semester must be a number between 1 and 8", "INVALID_SEMESTER");
    }

    const existingCode = await Course.exists({ courseCode: normalizedCourseCode });
    if (existingCode) {
      throw createApiError(409, "courseCode is already used by another course", "COURSE_CODE_EXISTS");
    }

    const course = await Course.create({
      title: title.trim(),
      description: String(description || "").trim(),
      teacherId: req.user.id,
      courseCode: normalizedCourseCode,
      inviteCode: await generateInviteCode(),
      year: Number(year),
      semester: Number(semester),
      students: []
    });

    res.status(201).json({ success: true, course });
  } catch (error) {
    next(error);
  }
}

async function joinCourse(req, res, next) {
  try {
    const joinCode = normalizeCourseCode(req.body.courseCode || req.body.inviteCode);

    if (isBlank(joinCode)) {
      throw createApiError(400, "courseCode is required", "MISSING_FIELDS");
    }

    const course = await Course.findOne({
      $or: [{ courseCode: joinCode }, { inviteCode: joinCode }]
    });
    if (!course) {
      throw createApiError(404, "Course not found for course code", "COURSE_NOT_FOUND");
    }

    const alreadyJoined = course.students.some((studentId) => String(studentId) === req.user.id);
    if (alreadyJoined) {
      throw createApiError(409, "Student already joined this course", "COURSE_ALREADY_JOINED");
    }

    course.students.push(req.user.id);
    await course.save();

    res.json({ success: true, course });
  } catch (error) {
    next(error);
  }
}

async function listMyCourses(req, res, next) {
  try {
    const filter = req.user.role === "teacher"
      ? { teacherId: req.user.id }
      : { students: req.user.id };

    const courses = await Course.find(filter)
      .populate("teacherId", "name email")
      .populate("students", "name email role rollNumber semester")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: courses.length, courses });
  } catch (error) {
    next(error);
  }
}

async function getCourse(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      throw createApiError(400, "Course id must be a valid MongoDB ObjectId", "INVALID_COURSE_ID");
    }

    const course = await Course.findById(id)
      .populate("teacherId", "name email")
      .populate("students", "name email role rollNumber semester");

    if (!course) {
      throw createApiError(404, "Course not found", "COURSE_NOT_FOUND");
    }

    const isTeacher = String(course.teacherId._id) === req.user.id;
    const isStudent = course.students.some((student) => String(student._id) === req.user.id);
    if (!isTeacher && !isStudent) {
      throw createApiError(403, "You are not part of this course", "FORBIDDEN");
    }

    res.json({ success: true, course });
  } catch (error) {
    next(error);
  }
}

async function updateCourse(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description = "", courseCode, year, semester } = req.body;

    if (!isValidObjectId(id)) {
      throw createApiError(400, "Course id must be a valid MongoDB ObjectId", "INVALID_COURSE_ID");
    }

    const course = await Course.findById(id);
    if (!course) {
      throw createApiError(404, "Course not found", "COURSE_NOT_FOUND");
    }

    if (String(course.teacherId) !== req.user.id) {
      throw createApiError(403, "Only the course teacher can edit this course", "FORBIDDEN");
    }

    if (!isBlank(title)) {
      course.title = String(title).trim();
    }

    course.description = String(description || "").trim();

    if (!isBlank(courseCode)) {
      const normalizedCourseCode = normalizeCourseCode(courseCode);
      if (!/^[A-Z0-9_-]{4,20}$/.test(normalizedCourseCode)) {
        throw createApiError(
          400,
          "courseCode must be 4-20 characters and can contain letters, numbers, underscore or hyphen",
          "INVALID_COURSE_CODE"
        );
      }

      const existingCode = await Course.exists({ courseCode: normalizedCourseCode, _id: { $ne: course._id } });
      if (existingCode) {
        throw createApiError(409, "courseCode is already used by another course", "COURSE_CODE_EXISTS");
      }

      course.courseCode = normalizedCourseCode;
    }

    if (year !== undefined) {
      if (typeof year !== "number" || year < 2000 || year > 2100) {
        throw createApiError(400, "year must be a number between 2000 and 2100", "INVALID_YEAR");
      }
      course.year = Number(year);
    }

    if (semester !== undefined) {
      if (typeof semester !== "number" || semester < 1 || semester > 8) {
        throw createApiError(400, "semester must be a number between 1 and 8", "INVALID_SEMESTER");
      }
      course.semester = Number(semester);
    }

    await course.save();
    const updatedCourse = await Course.findById(course._id)
      .populate("teacherId", "name email")
      .populate("students", "name email role rollNumber semester");

    res.json({ success: true, course: updatedCourse });
  } catch (error) {
    next(error);
  }
}

module.exports = { createCourse, getCourse, joinCourse, listMyCourses, updateCourse };

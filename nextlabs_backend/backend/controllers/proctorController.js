const ActivityEvent = require("../models/ActivityEvent");
const ExamAttempt = require("../models/ExamAttempt");
const { createApiError } = require("../utils/apiError");
const { isBlank } = require("../utils/validators");

const PROCTOR_EVENTS = ["tab_switch", "copy_attempt", "paste_attempt", "fullscreen_exit"];

async function recordProctorEvent(req, res, next) {
  try {
    const { examId, type, meta = {} } = req.body;

    if (isBlank(examId) || isBlank(type)) {
      throw createApiError(400, "examId and type are required", "MISSING_FIELDS");
    }

    if (!PROCTOR_EVENTS.includes(type)) {
      throw createApiError(400, "Unsupported proctor event", "INVALID_PROCTOR_EVENT");
    }

    const attempt = await ExamAttempt.findOne({ examId, studentId: req.user.id });
    if (!attempt) {
      throw createApiError(404, "Exam attempt not found", "ATTEMPT_NOT_FOUND");
    }

    attempt.violations.push({ type, meta });
    if (type === "tab_switch") {
      attempt.tabSwitchCount += 1;
    }

    const limit = Number(process.env.PROCTOR_VIOLATION_LIMIT || 0);
    const autoSubmitEnabled = process.env.PROCTOR_AUTO_SUBMIT === "true";
    if (autoSubmitEnabled && limit > 0 && attempt.violations.length >= limit && attempt.status === "ongoing") {
      attempt.status = "auto-submitted";
      attempt.endTime = new Date();
    }

    await attempt.save();

    const event = await ActivityEvent.create({
      studentId: req.user.id,
      type,
      severity: "warning",
      message: `Proctoring violation: ${type}`,
      meta: {
        ...meta,
        examId,
        attemptId: attempt._id,
        studentName: req.user.name,
        studentEmail: req.user.email
      }
    });

    req.app.get("io")?.emit("proctor_alert", event);

    res.status(201).json({ success: true, event, attempt });
  } catch (error) {
    next(error);
  }
}

async function listExamProctorEvents(req, res, next) {
  try {
    const events = await ActivityEvent.find({ "meta.examId": req.params.examId })
      .sort({ createdAt: -1 })
      .limit(500);

    res.json({ success: true, count: events.length, events });
  } catch (error) {
    next(error);
  }
}

module.exports = { listExamProctorEvents, recordProctorEvent };

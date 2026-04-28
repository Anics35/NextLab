const ActivityEvent = require("../models/ActivityEvent");

async function listActivity(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const filter = {};

    if (req.query.studentId) {
      filter.studentId = req.query.studentId;
    }

    if (req.query.type) {
      filter.type = req.query.type;
    }

    if (req.query.severity) {
      filter.severity = req.query.severity;
    }

    const events = await ActivityEvent.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { listActivity };

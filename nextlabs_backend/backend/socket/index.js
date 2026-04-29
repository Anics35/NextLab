const { Server } = require("socket.io");
const ActivityEvent = require("../models/ActivityEvent");
const ExamAttempt = require("../models/ExamAttempt");
const { verifyToken } = require("../services/auth");
const { bindSocketSession, setSocketServer } = require("../services/sessionService");

const studentState = new Map();

function getState(studentId) {
  if (!studentState.has(studentId)) {
    studentState.set(studentId, {
      runs: [],
      tabSwitches: [],
      lastHeartbeatAt: Date.now()
    });
  }

  return studentState.get(studentId);
}

function pruneRecent(timestamps, windowMs) {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter((timestamp) => timestamp >= cutoff);
}

async function saveEvent(io, payload) {
  const event = await ActivityEvent.create(payload);
  io.emit("student_update", event);

  if (payload.severity === "warning") {
    io.emit("alert_event", event);
  }

  return event;
}

async function handleStudentEvent(io, socket, type, payload = {}) {
  if (!socket.user || socket.user.role !== "student") {
    return;
  }

  const studentId = socket.user.id;
  const state = getState(studentId);
  let severity = "info";
  let message = "";

  if (type === "run_clicked") {
    state.runs = pruneRecent([...state.runs, Date.now()], 60 * 1000);

    if (state.runs.length >= 8) {
      severity = "warning";
      message = "Frequent runs detected";
    }
  }

  if (type === "tab_switch") {
    state.tabSwitches = pruneRecent([...state.tabSwitches, Date.now()], 5 * 60 * 1000);

    if (state.tabSwitches.length >= 3) {
      severity = "warning";
      message = "Multiple tab switches detected";
    }
  }

  if (["copy_attempt", "paste_attempt", "fullscreen_exit"].includes(type)) {
    severity = "warning";
    message = `Proctoring violation: ${type}`;
  }

  if (type === "heartbeat") {
    const now = Date.now();
    const idleMs = now - state.lastHeartbeatAt;
    state.lastHeartbeatAt = now;

    if (idleMs > 45 * 1000) {
      severity = "warning";
      message = "Student appears idle";
    }
  }

  const event = await saveEvent(io, {
    studentId,
    type,
    severity,
    message,
    meta: {
      ...payload,
      studentName: socket.user.name,
      studentEmail: socket.user.email
    }
  });

  if (type === "submit_clicked") {
    io.emit("submission_event", event);
  }

  if (["tab_switch", "copy_attempt", "paste_attempt", "fullscreen_exit"].includes(type) && payload.examId) {
    const update = {
      $push: {
        violations: {
          type,
          timestamp: new Date(),
          meta: payload
        }
      }
    };

    if (type === "tab_switch") {
      update.$inc = { tabSwitchCount: 1 };
    }

    const attempt = await ExamAttempt.findOneAndUpdate(
      { examId: payload.examId, studentId, status: "ongoing" },
      update,
      { new: true }
    );

    const limit = Number(process.env.PROCTOR_VIOLATION_LIMIT || 0);
    if (attempt && limit > 0 && attempt.violations.length >= limit) {
      attempt.status = "auto-submitted";
      attempt.endTime = new Date();
      await attempt.save();
      socket.emit("exam_end", {
        examId: payload.examId,
        attemptId: String(attempt._id),
        reason: "violation_limit"
      });
    }

    io.emit("proctor_alert", event);
  }
}

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  setSocketServer(io);

  io.on("connection", async (socket) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      const payload = verifyToken(token);
      const sessionActive = await bindSocketSession(payload.sub, payload.sessionToken, socket.id);

      if (!sessionActive && process.env.SESSION_STRICT === "true") {
        socket.disconnect(true);
        return;
      }

      socket.user = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role
      };
      socket.join(`user:${payload.sub}`);
    } catch (error) {
      socket.disconnect(true);
      return;
    }

    socket.on("run_clicked", (payload) => handleStudentEvent(io, socket, "run_clicked", payload));
    socket.on("submit_clicked", (payload) => handleStudentEvent(io, socket, "submit_clicked", payload));
    socket.on("tab_switch", (payload) => handleStudentEvent(io, socket, "tab_switch", payload));
    socket.on("copy_attempt", (payload) => handleStudentEvent(io, socket, "copy_attempt", payload));
    socket.on("paste_attempt", (payload) => handleStudentEvent(io, socket, "paste_attempt", payload));
    socket.on("fullscreen_exit", (payload) => handleStudentEvent(io, socket, "fullscreen_exit", payload));
    socket.on("heartbeat", (payload) => handleStudentEvent(io, socket, "heartbeat", payload));
  });

  return io;
}

module.exports = { initSocket };

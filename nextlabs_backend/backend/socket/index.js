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
  try {
    const event = await ActivityEvent.create(payload);
    io.emit("student_update", event);

    if (payload.severity === "warning") {
      io.emit("alert_event", event);
    }
    return event;
  } catch (error) {
    console.error("Activity DB Save Error:", error);
  }
}

async function handleStudentEvent(io, socket, type, payload = {}) {
  // Only track students
  if (!socket.user || socket.user.role !== "student") {
    return;
  }

  const violationEvents = ["tab_switch", "blur", "copy", "paste", "copy_paste", "contextmenu", "fullscreen_exit", "copy_attempt", "paste_attempt"];
  const requiresActiveAttempt = violationEvents.includes(type) || type.startsWith("shortcut_");

  if (requiresActiveAttempt) {
    const activeAttempt = payload.examId
      ? await ExamAttempt.findOne({ examId: payload.examId, studentId: socket.user.id, status: "ongoing" })
      : await ExamAttempt.findOne({ studentId: socket.user.id, status: "ongoing" }).sort({ updatedAt: -1 });

    if (!activeAttempt) {
      return;
    }

    if (!payload.examId) {
      payload.examId = String(activeAttempt.examId);
    }
  }

  const studentId = socket.user.id;
  const state = getState(studentId);
  let severity = "info";
  let message = "";

  // 🔴 FIX: Recognize the exact events your frontend is sending (copy, paste, contextmenu, shortcut_c, etc.)
  const isViolation = violationEvents.includes(type) || type.startsWith("shortcut_");

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

  if (type === "heartbeat") {
    const now = Date.now();
    const idleMs = now - state.lastHeartbeatAt;
    state.lastHeartbeatAt = now;
    if (idleMs > 45 * 1000) {
      severity = "warning";
      message = "Student appears idle";
    }
  }

  // 🔴 FIX: If it's a violation, ALWAYS alert the Teacher Dashboard instantly, regardless of examId
  if (isViolation) {
    severity = "warning";
    message = `Proctoring violation: ${type}`;
    
    // Broadcast the exact shape the TeacherDashboard.jsx expects
    io.emit("proctor_alert", {
      studentId: studentId,
      studentName: socket.user.name,
      type: type,
      time: new Date().toLocaleTimeString()
    });
  }

  // Save the event log
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

  // 🔴 FIX: Keep the DB Exam Tracking isolated so it doesn't block the live UI alert
  if (isViolation && payload.examId) {
    try {
      const update = {
        $push: {
          violations: { type, at: new Date(), timestamp: new Date(), meta: payload }
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
      const autoSubmitEnabled = process.env.PROCTOR_AUTO_SUBMIT === "true";
      if (autoSubmitEnabled && attempt && limit > 0 && attempt.violations.length >= limit) {
        attempt.status = "auto-submitted";
        attempt.endTime = new Date();
        await attempt.save();
        socket.emit("exam_end", {
          examId: payload.examId,
          attemptId: String(attempt._id),
          reason: "violation_limit"
        });
      }
    } catch (err) {
      console.error("Exam Attempt Update Error:", err);
    }
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

      // Handle strict sessions
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
      console.log(`✅ [${socket.user.role}] connected: ${socket.user.name}`);

    } catch (error) {
      socket.disconnect(true);
      return;
    }

    // 🔴 FIX: Properly route the exact event names the Frontend uses
    socket.on("run_clicked", (payload) => handleStudentEvent(io, socket, "run_clicked", payload));
    socket.on("submit_clicked", (payload) => handleStudentEvent(io, socket, "submit_clicked", payload));
    socket.on("heartbeat", (payload) => handleStudentEvent(io, socket, "heartbeat", payload));
    
    // Front-end specifically sends these
    socket.on("tab_switch", (payload) => handleStudentEvent(io, socket, "tab_switch", payload));
    socket.on("copy_paste", (payload) => handleStudentEvent(io, socket, "copy_paste", payload));
    socket.on("proctor_event", (payload) => {
      io.emit("proctor_alert", payload);
      handleStudentEvent(io, socket, payload.type, payload);
    }); 
  });

  return io;
}

module.exports = { initSocket };

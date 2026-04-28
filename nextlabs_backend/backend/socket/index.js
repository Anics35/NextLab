const { Server } = require("socket.io");
const ActivityEvent = require("../models/ActivityEvent");
const { verifyToken } = require("../services/auth");

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
}

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      const payload = verifyToken(token);

      socket.user = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role
      };
    } catch (error) {
      socket.disconnect(true);
      return;
    }

    socket.on("run_clicked", (payload) => handleStudentEvent(io, socket, "run_clicked", payload));
    socket.on("submit_clicked", (payload) => handleStudentEvent(io, socket, "submit_clicked", payload));
    socket.on("tab_switch", (payload) => handleStudentEvent(io, socket, "tab_switch", payload));
    socket.on("heartbeat", (payload) => handleStudentEvent(io, socket, "heartbeat", payload));
  });

  return io;
}

module.exports = { initSocket };

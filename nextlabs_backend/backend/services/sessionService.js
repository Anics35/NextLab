const crypto = require("crypto");
const ActiveSession = require("../models/ActiveSession");

let ioInstance = null;

function setSocketServer(io) {
  ioInstance = io;
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function createActiveSession(userId) {
  const existing = await ActiveSession.findOne({ userId });

  if (existing && ioInstance) {
    ioInstance.to(`user:${userId}`).emit("force_logout", {
      reason: "Your account was opened in another session."
    });
  }

  const sessionToken = createSessionToken();
  await ActiveSession.findOneAndUpdate(
    { userId },
    {
      userId,
      sessionToken,
      socketId: "",
      active: true,
      lastSeenAt: new Date()
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return sessionToken;
}

async function bindSocketSession(userId, sessionToken, socketId) {
  const session = await ActiveSession.findOne({ userId, sessionToken, active: true });

  if (!session) {
    return false;
  }

  session.socketId = socketId;
  session.lastSeenAt = new Date();
  await session.save();
  return true;
}

async function assertActiveSession(userId, sessionToken) {
  const strict = process.env.SESSION_STRICT === "true";

  if (!sessionToken) {
    return !strict;
  }

  const session = await ActiveSession.findOne({ userId, sessionToken, active: true });
  return Boolean(session);
}

async function touchSession(userId, sessionToken) {
  if (!sessionToken) {
    return;
  }

  await ActiveSession.updateOne(
    { userId, sessionToken, active: true },
    { lastSeenAt: new Date() }
  );
}

module.exports = {
  assertActiveSession,
  bindSocketSession,
  createActiveSession,
  setSocketServer,
  touchSession
};

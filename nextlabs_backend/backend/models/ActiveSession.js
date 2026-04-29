const mongoose = require("mongoose");

const activeSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    socketId: { type: String, default: "" },
    sessionToken: { type: String, required: true, index: true },
    active: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActiveSession", activeSessionSchema);

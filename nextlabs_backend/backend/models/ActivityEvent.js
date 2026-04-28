const mongoose = require("mongoose");

const activityEventSchema = new mongoose.Schema(
  {
    studentId: { type: String, default: "anonymous", index: true },
    type: { type: String, required: true, index: true },
    severity: {
      type: String,
      enum: ["info", "warning"],
      default: "info"
    },
    message: { type: String, default: "" },
    meta: { type: Object, default: {} }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActivityEvent", activityEventSchema);

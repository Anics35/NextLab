const mongoose = require("mongoose");

const examProblemSchema = new mongoose.Schema(
  {
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    marks: { type: Number, required: true, min: 0 },
    individualTimeLimit: { type: Number, min: 1 }
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    problems: {
      type: [examProblemSchema],
      validate: [(value) => value.length > 0, "At least one problem is required"]
    },
    timerType: {
      type: String,
      enum: ["global", "per-problem"],
      default: "global"
    },
    totalDuration: { type: Number, required: true, min: 1 },
    navigationControl: { type: Boolean, default: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", examSchema);

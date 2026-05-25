const mongoose = require("mongoose");

const examProblemSchema = new mongoose.Schema(
  {
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    marks: { type: Number, required: true, min: 0 },
    duration: { type: Number, min: 1 }
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    instructions: { type: String, default: "", trim: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    problems: {
      type: [examProblemSchema],
      validate: [(value) => value.length > 0, "At least one problem is required"]
    },
    timerType: {
      type: String,
      enum: ["global", "per_problem"],
      default: "global"
    },
    duration: { type: Number, min: 1 },
    navigationControl: { type: Boolean, default: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["draft", "published", "ongoing", "ended"],
      default: "published",
      index: true
    },
    marksFinalized: { type: Boolean, default: false },
    showResultsImmediately: { type: Boolean, default: false },
    resultVisibility: {
      type: String,
      enum: ["manual", "immediate"],
      default: "manual"
    },
    resultsVisible: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false, index: true },
    visibleToStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", examSchema);

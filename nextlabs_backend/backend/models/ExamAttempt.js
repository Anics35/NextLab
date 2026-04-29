const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    code: { type: String, default: "" },
    language: { type: String, default: "" },
    passed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    marks: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    manualOverride: { type: Boolean, default: false },
    submittedAt: Date,
    details: { type: Array, default: [] },
    aiAnalysis: { type: Object }
  },
  { _id: false }
);

const violationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    meta: { type: Object, default: {} }
  },
  { _id: false }
);

const examAttemptSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true, index: true },
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    currentProblemIndex: { type: Number, default: 0 },
    answers: [answerSchema],
    violations: [violationSchema],
    tabSwitchCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["ongoing", "submitted", "auto-submitted"],
      default: "ongoing",
      index: true
    },
    totalScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

examAttemptSchema.index({ studentId: 1, examId: 1 }, { unique: true });

module.exports = mongoose.model("ExamAttempt", examAttemptSchema);

const mongoose = require("mongoose");

const submissionDetailSchema = new mongoose.Schema(
  {
    input: String,
    expectedOutput: String,
    actualOutput: String,
    passed: Boolean,
    error: String
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    studentId: { type: String, default: "anonymous", index: true },
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", index: true },
    examAttemptId: { type: mongoose.Schema.Types.ObjectId, ref: "ExamAttempt", index: true },
    code: { type: String, required: true },
    language: { type: String, required: true },
    total: { type: Number, required: true },
    passed: { type: Number, required: true },
    failed: { type: Number, required: true },
    details: [submissionDetailSchema],
    marks: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    manualOverride: { type: Boolean, default: false },
    aiAnalysis: { type: Object }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", submissionSchema);

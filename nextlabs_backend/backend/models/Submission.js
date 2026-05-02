const mongoose = require("mongoose");

const testResultSchema = new mongoose.Schema(
  {
    input: { type: String, default: "" },
    expected: { type: String, default: "" },
    output: { type: String, default: "" },
    passed: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
    error: { type: String, default: "" }
  },
  { _id: false }
);

const submissionProblemSchema = new mongoose.Schema(
  {
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    code: { type: String, required: true },
    language: { type: String, required: true },
    input: { type: String, default: "" },
    output: { type: String, default: "" },
    score: { type: Number, default: 0 },
    maxMarks: { type: Number, default: 0 },
    passed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    passedPublic: { type: Number, default: 0 },
    totalPublic: { type: Number, default: 0 },
    passedHidden: { type: Number, default: 0 },
    totalHidden: { type: Number, default: 0 },
    testResults: { type: [testResultSchema], default: [] },
    manualOverride: { type: Boolean, default: false },
    submittedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true, index: true },
    examAttemptId: { type: mongoose.Schema.Types.ObjectId, ref: "ExamAttempt", index: true },
    problems: { type: [submissionProblemSchema], default: [] }
    ,
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem" },
    code: { type: String },
    language: { type: String },
    input: { type: String, default: "" },
    output: { type: String, default: "" },
    score: { type: Number, default: 0 },
    passed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    passedPublic: { type: Number, default: 0 },
    totalPublic: { type: Number, default: 0 },
    passedHidden: { type: Number, default: 0 },
    totalHidden: { type: Number, default: 0 },
    details: { type: Array, default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", submissionSchema);

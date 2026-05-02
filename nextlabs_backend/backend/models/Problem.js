const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, default: "" },
    output: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const legacyTestCaseSchema = new mongoose.Schema(
  {
    input: { type: String, default: "" },
    expectedOutput: { type: String, required: true, trim: true },
    isPublic: { type: Boolean, default: false }
  },
  { _id: false }
);

const problemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy"
    },
    publicTestCases: { type: [testCaseSchema], default: [] },
    hiddenTestCases: { type: [testCaseSchema], default: [] },
    testCases: { type: [legacyTestCaseSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Problem", problemSchema);

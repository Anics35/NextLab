const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, default: "" },
    expectedOutput: { type: String, required: true, trim: true },
    // ADD THIS LINE:
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
    testCases: {
      type: [testCaseSchema],
      validate: [(value) => value.length > 0, "At least one test case is required"]
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Problem", problemSchema);
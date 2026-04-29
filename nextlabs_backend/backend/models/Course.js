const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    courseCode: { type: String, required: true, unique: true, sparse: true, uppercase: true, trim: true },
    inviteCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);

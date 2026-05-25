const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true }, // Field is 'email'
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
      index: true
    },
    disabled: { type: Boolean, default: false, index: true },
    rollNumber: { type: String, trim: true, index: true, sparse: true },
    semester: { type: String, trim: true, sparse: true },
    phone: { type: String, trim: true, sparse: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

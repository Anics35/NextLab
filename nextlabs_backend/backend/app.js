require("dotenv").config();

const cors = require("cors");
const express = require("express");
const activityRoutes = require("./routes/activityRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const authRoutes = require("./routes/authRoutes");
const codeRoutes = require("./routes/codeRoutes");
const courseRoutes = require("./routes/courseRoutes");
const examAttemptRoutes = require("./routes/examAttemptRoutes");
const examRoutes = require("./routes/examRoutes");
const problemRoutes = require("./routes/problemRoutes");
const proctorRoutes = require("./routes/proctorRoutes");
const resultRoutes = require("./routes/resultRoutes");
const submissionRoutes = require("./routes/submissionRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`, {
    query: req.query,
    body: req.method === "GET" ? undefined : req.body
  });
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "nexlab-backend" });
});

app.use("/auth", authRoutes);
app.use("/", codeRoutes);
app.use("/course", courseRoutes);
app.use("/courses", courseRoutes);
app.use("/exam", examRoutes);
app.use("/exams", examRoutes);
app.use("/exam-attempts", examAttemptRoutes);
app.use("/problem", problemRoutes);
app.use("/problems", problemRoutes);
app.use("/proctor", proctorRoutes);
app.use("/submission", submissionRoutes);
app.use("/submissions", submissionRoutes);
app.use("/activity", activityRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/result", resultRoutes);
app.use("/results", resultRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: "ROUTE_NOT_FOUND",
    error: "Route not found"
  });
});

app.use((error, req, res, next) => {
  console.error(error.message);

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      code: "INVALID_JSON",
      error: "Request body must be valid JSON"
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      code: "INVALID_ID",
      error: "Invalid id format"
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      error: error.message
    });
  }

  res.status(error.status || 500).json({
    success: false,
    code: error.code || "SERVER_ERROR",
    error: error.message || "Internal server error"
  });
});

module.exports = app;

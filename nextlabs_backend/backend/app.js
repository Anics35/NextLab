require("dotenv").config();

const cors = require("cors");
const express = require("express");
const activityRoutes = require("./routes/activityRoutes");
const authRoutes = require("./routes/authRoutes");
const codeRoutes = require("./routes/codeRoutes");
const problemRoutes = require("./routes/problemRoutes");
const submissionRoutes = require("./routes/submissionRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "nexlab-backend" });
});

app.use("/auth", authRoutes);
app.use("/", codeRoutes);
app.use("/problems", problemRoutes);
app.use("/submissions", submissionRoutes);
app.use("/activity", activityRoutes);

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

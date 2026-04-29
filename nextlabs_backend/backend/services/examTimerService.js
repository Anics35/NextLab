const Exam = require("../models/Exam");
const ExamAttempt = require("../models/ExamAttempt");
const { recalculateAttemptScore } = require("./examEvaluationService");

let timerHandle = null;

async function finalizeExpiredAttempts(io) {
  const now = new Date();
  const attempts = await ExamAttempt.find({ status: "ongoing" }).populate("examId");

  for (const attempt of attempts) {
    const exam = attempt.examId;
    if (!exam || now <= exam.endTime) {
      continue;
    }

    attempt.status = "auto-submitted";
    attempt.endTime = now;
    recalculateAttemptScore(attempt);
    await attempt.save();

    if (io) {
      io.to(`user:${attempt.studentId}`).emit("exam_end", {
        examId: String(exam._id),
        attemptId: String(attempt._id),
        reason: "time_expired"
      });
    }
  }
}

function startExamTimerWorker(io) {
  if (timerHandle) {
    return timerHandle;
  }

  timerHandle = setInterval(() => {
    finalizeExpiredAttempts(io).catch((error) => {
      console.error("Exam timer worker failed:", error.message);
    });
  }, 30 * 1000);

  return timerHandle;
}

async function isExamExpired(examId) {
  const exam = await Exam.findById(examId);
  return !exam || new Date() > exam.endTime;
}

module.exports = { finalizeExpiredAttempts, isExamExpired, startExamTimerWorker };

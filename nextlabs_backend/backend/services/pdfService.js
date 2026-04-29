function addLine(doc, label, value) {
  doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(String(value || "-"));
}

async function buildResultPdf({ student, exam, attempt }) {
  let PDFDocument;
  try {
    PDFDocument = require("pdfkit");
  } catch (error) {
    error.status = 500;
    error.code = "PDFKIT_MISSING";
    error.message = "pdfkit is not installed. Run npm install pdfkit in nextlabs_backend.";
    throw error;
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("NextLab Exam Result", { align: "center" });
    doc.moveDown();

    doc.fontSize(12);
    addLine(doc, "Student", `${student.name} (${student.email})`);
    addLine(doc, "Exam", exam.title);
    addLine(doc, "Status", attempt.status);
    addLine(doc, "Started", attempt.startTime);
    addLine(doc, "Submitted", attempt.endTime || attempt.updatedAt);
    addLine(doc, "Total Score", attempt.totalScore);
    addLine(doc, "Violations", attempt.violations.length);
    doc.moveDown();

    doc.fontSize(15).text("Problem Scores");
    doc.moveDown(0.5);
    attempt.answers.forEach((answer, index) => {
      doc.fontSize(12).text(`${index + 1}. Problem ${answer.problemId}`);
      addLine(doc, "Passed", `${answer.passed}/${answer.total}`);
      addLine(doc, "Score", `${answer.finalScore || answer.score}/${answer.marks}`);
      doc.moveDown(0.5);
    });

    if (attempt.violations.length > 0) {
      doc.addPage();
      doc.fontSize(15).text("Violations");
      doc.moveDown(0.5);
      attempt.violations.forEach((violation, index) => {
        doc.fontSize(12).text(`${index + 1}. ${violation.type} at ${violation.timestamp}`);
      });
    }

    doc.end();
  });
}

module.exports = { buildResultPdf };

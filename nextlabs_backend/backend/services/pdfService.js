function addLine(doc, label, value) {
  doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(String(value || "-"));
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function normalizeRollNumber(value) {
  return String(value || "").trim();
}

function sortRollNumbersAscending(a, b) {
  return normalizeRollNumber(a).localeCompare(normalizeRollNumber(b), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function formatMarks(value) {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return numericValue.toFixed(2).replace(/\.00$/, "");
}

function getExamReportScore(submission) {
  const attemptScore = Number(submission?.examAttemptId?.totalScore);
  if (Number.isFinite(attemptScore)) {
    return attemptScore;
  }

  const problemScores = Array.isArray(submission?.problems)
    ? submission.problems.reduce((sum, problem) => sum + Number(problem?.score || 0), 0)
    : 0;

  const directScore = Number(submission?.score);
  if (Number.isFinite(directScore) && directScore > 0) {
    return directScore;
  }

  return problemScores;
}

function getExamReportDate(exam) {
  return exam?.startTime || exam?.createdAt || null;
}

async function buildExamReportWorkbook({ exam, course, submissions = [] }) {
  let ExcelJS;
  try {
    ExcelJS = require("exceljs");
  } catch (error) {
    error.status = 500;
    error.code = "EXCELJS_MISSING";
    error.message = "exceljs is not installed. Run npm install exceljs in nextlabs_backend.";
    throw error;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Exam Report");
  const rows = Array.isArray(submissions)
    ? [...submissions].sort((left, right) => sortRollNumbersAscending(left?.userId?.rollNumber, right?.userId?.rollNumber))
    : [];

  worksheet.mergeCells("A1:D1");
  worksheet.getCell("A1").value = "NextLab Exam Wise Report";
  worksheet.getCell("A1").font = { bold: true, size: 16 };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  worksheet.getCell("A3").value = "Exam";
  worksheet.getCell("B3").value = exam?.title || "-";
  worksheet.getCell("A4").value = "Conducted On";
  worksheet.getCell("B4").value = formatDate(getExamReportDate(exam));
  worksheet.getCell("A5").value = "Semester";
  worksheet.getCell("B5").value = course?.semester ?? "-";
  worksheet.getCell("A6").value = "Year";
  worksheet.getCell("B6").value = course?.year ?? "-";
  worksheet.getCell("A7").value = "Course";
  worksheet.getCell("B7").value = course?.title || "-";

  [3, 4, 5, 6, 7].forEach((row) => {
    worksheet.getCell(`A${row}`).font = { bold: true };
  });

  const tableHeaderRow = 10;
  const tableStartRow = tableHeaderRow + 1;
  const columns = ["S.No", "Student Name", "Roll No.", "Marks"];

  columns.forEach((label, index) => {
    const cell = worksheet.getCell(tableHeaderRow, index + 1);
    cell.value = label;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFEFEF" }
    };
  });

  rows.forEach((submission, index) => {
    const rowNumber = tableStartRow + index;
    const row = worksheet.getRow(rowNumber);
    row.getCell(1).value = index + 1;
    row.getCell(2).value = submission?.userId?.name || "-";
    row.getCell(3).value = submission?.userId?.rollNumber || "-";
    row.getCell(4).value = formatMarks(getExamReportScore(submission));
    row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
    row.commit?.();
  });

  if (rows.length === 0) {
    worksheet.mergeCells(`A${tableStartRow}:D${tableStartRow}`);
    worksheet.getCell(`A${tableStartRow}`).value = "No student submissions found for this exam.";
    worksheet.getCell(`A${tableStartRow}`).alignment = { horizontal: "center" };
  }

  for (let rowNumber = tableHeaderRow; rowNumber < tableStartRow + Math.max(rows.length, 1); rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
      cell.alignment = { vertical: "middle" };
    });
  }

  worksheet.getColumn(1).width = 10;
  worksheet.getColumn(2).width = 24;
  worksheet.getColumn(3).width = 18;
  worksheet.getColumn(4).width = 12;

  worksheet.getRow(tableHeaderRow).font = { bold: true };
  worksheet.getRow(tableHeaderRow).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFEFEF" }
  };

  return workbook;
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
    addLine(doc, "Roll Number", student.rollNumber);
    addLine(doc, "Semester", student.semester);
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
      doc.fontSize(12).text(`${index + 1}. ${answer.problemId?.title || `Problem ${index + 1}`}`);
      addLine(doc, "Passed", `${answer.passed}/${answer.total}`);
      addLine(doc, "Score", `${answer.finalScore || answer.score}/${answer.marks}`);
      doc.moveDown(0.5);
    });

    if (attempt.violations.length > 0) {
      doc.addPage();
      doc.fontSize(15).text("Violations");
      doc.moveDown(0.5);
      attempt.violations.forEach((violation, index) => {
        doc.fontSize(12).text(`${index + 1}. ${violation.type} at ${violation.at || violation.timestamp}`);
      });
    }

    doc.end();
  });
}

async function buildExamReportPdf({ exam, course, submissions = [] }) {
  let PDFDocument;
  try {
    PDFDocument = require("pdfkit");
  } catch (error) {
    error.status = 500;
    error.code = "PDFKIT_MISSING";
    error.message = "pdfkit is not installed. Run npm install pdfkit in nextlabs_backend.";
    throw error;
  }

  const rows = Array.isArray(submissions)
    ? [...submissions].sort((left, right) => sortRollNumbersAscending(left?.userId?.rollNumber, right?.userId?.rollNumber))
    : [];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 42, size: "A4" });
    const chunks = [];
    const columns = [
      { label: "S.No", width: 40 },
      { label: "Student Name", width: 190 },
      { label: "Roll No.", width: 120 },
      { label: "Marks", width: 90 }
    ];

    const renderTableHeader = () => {
      const headerTop = doc.y;
      let x = doc.page.margins.left;

      doc.font("Helvetica-Bold").fontSize(11);
      columns.forEach((column) => {
        doc.rect(x, headerTop, column.width, 22).stroke();
        doc.text(column.label, x + 5, headerTop + 6, { width: column.width - 10, align: "center" });
        x += column.width;
      });

      doc.moveDown(0.2);
      doc.font("Helvetica").fontSize(10);
    };

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("NextLab Exam Wise Report", { align: "center" });
    doc.moveDown(0.6);
    doc.fontSize(12);

    addLine(doc, "Exam", exam?.title);
    addLine(doc, "Conducted On", formatDate(getExamReportDate(exam)));
    addLine(doc, "Semester", course?.semester);
    addLine(doc, "Year", course?.year);
    addLine(doc, "Course", course?.title);
    addLine(doc, "Generated At", new Date().toLocaleString());
    doc.moveDown();

    doc.fontSize(14).text("Student Marks");
    doc.moveDown(0.4);

    renderTableHeader();

    const rowHeight = 22;
    let y = doc.y;

    rows.forEach((submission, index) => {
      const name = submission?.userId?.name || "-";
      const rollNumber = submission?.userId?.rollNumber || "-";
      const marks = getExamReportScore(submission);

      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        doc.moveDown(0.2);
        renderTableHeader();
        y = doc.y;
      }

      let x = doc.page.margins.left;
      const cells = [String(index + 1), name, rollNumber, formatMarks(marks)];

      cells.forEach((cell, cellIndex) => {
        const column = columns[cellIndex];
        doc.rect(x, y, column.width, rowHeight).stroke();
        doc.text(String(cell), x + 5, y + 6, {
          width: column.width - 10,
          align: cellIndex === 3 ? "center" : "left"
        });
        x += column.width;
      });

      y += rowHeight;
    });

    if (rows.length === 0) {
      doc.moveDown(0.5);
      doc.text("No student submissions found for this exam.");
    }

    doc.end();
  });
}

module.exports = { buildResultPdf, buildExamReportPdf, buildExamReportWorkbook };

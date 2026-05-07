const { runCode } = require("./judge0");

function normalizeOutput(output = "") {
  return String(output).trim().replace(/\r/g, "");
}

function computeScore(passedTestCases, totalTestCases, totalMarks = 0) {
  if (!Number.isFinite(totalTestCases) || totalTestCases <= 0) {
    return 0;
  }

  const safePassed = Math.max(0, Number(passedTestCases) || 0);
  const safeMarks = Math.max(0, Number(totalMarks) || 0);
  return Number(((safePassed / totalTestCases) * safeMarks).toFixed(2));
}

async function evaluateSubmission({ code, language, problem, visibility = "all" }) {
  const details = [];
  const legacyCases = Array.isArray(problem.testCases) ? problem.testCases : [];
  const normalizeCase = (testCase, kind) => ({
    input: String(testCase.input || ""),
    output: String(testCase.output || testCase.expectedOutput || ""),
    _kind: kind
  });
  const publicCases = Array.isArray(problem.publicTestCases) && problem.publicTestCases.length
    ? problem.publicTestCases.map((item) => normalizeCase(item, "public"))
    : legacyCases.filter((item) => item.isPublic).map((item) => normalizeCase(item, "public"));
  const hiddenCases = Array.isArray(problem.hiddenTestCases) && problem.hiddenTestCases.length
    ? problem.hiddenTestCases.map((item) => normalizeCase(item, "hidden"))
    : legacyCases.filter((item) => !item.isPublic).map((item) => normalizeCase(item, "hidden"));
  if (publicCases.length + hiddenCases.length === 0) {
    const error = new Error("Problem has no test cases configured");
    error.status = 400;
    error.code = "NO_TEST_CASES";
    throw error;
  }
  const allCases = [...publicCases, ...hiddenCases];
  const selectedCases = visibility === "public" ? allCases.filter((item) => item._kind === "public") : allCases;

  for (const testCase of selectedCases) {
    const result = await runCode(language, code, testCase.input);
    const actualOutput = normalizeOutput(result.output);
    const expectedOutput = normalizeOutput(testCase.output);
    const passed = !result.error && actualOutput === expectedOutput;
    console.log("INPUT:", String(testCase.input || ""));
    console.log("OUTPUT:", result.output || result.error || "");
    console.log("EXPECTED:", testCase.output || "");

    details.push({
      input: testCase.input,
      expectedOutput,
      actualOutput: result.output || "",
      passed,
      error: result.error || "",
      visibility: testCase._kind
    });
  }

  const publicResults = details.filter((detail) => detail.visibility === "public");
  const hiddenResults = details.filter((detail) => detail.visibility === "hidden");
  const passedPublic = publicResults.filter((detail) => detail.passed).length;
  const totalPublic = publicResults.length;
  const passedHidden = hiddenResults.filter((detail) => detail.passed).length;
  const totalHidden = hiddenResults.length;
  const passed = details.filter((detail) => detail.passed).length;
  const total = details.length;

  return {
    total,
    passed,
    failed: total - passed,
    passedPublic,
    totalPublic,
    passedHidden,
    totalHidden,
    details
  };
}

module.exports = { computeScore, evaluateSubmission, normalizeOutput };

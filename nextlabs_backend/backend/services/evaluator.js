const { runCode } = require("./judge0");

function normalizeOutput(output = "") {
  return String(output).replace(/\r\n/g, "\n").trim();
}

async function evaluateSubmission({ code, language, problem }) {
  const details = [];

  for (const testCase of problem.testCases) {
    const result = await runCode(language, code, testCase.input);
    const actualOutput = normalizeOutput(result.output);
    const expectedOutput = normalizeOutput(testCase.expectedOutput);
    const passed = !result.error && actualOutput === expectedOutput;

    details.push({
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: result.output || "",
      passed,
      error: result.error || ""
    });
  }

  const passed = details.filter((detail) => detail.passed).length;
  const total = details.length;

  return {
    total,
    passed,
    failed: total - passed,
    details
  };
}

module.exports = { evaluateSubmission, normalizeOutput };

function buildAnalysis({ problem, answer }) {
  const code = answer.code || "";
  const failed = Math.max((answer.total || 0) - (answer.passed || 0), 0);
  const confidence = answer.total > 0 ? Math.round((answer.passed / answer.total) * 100) : 50;

  let approach = "General implementation";
  if (/map|dict|object|hash/i.test(code)) {
    approach = "Hash-based lookup";
  } else if (/for\s*\(|while\s*\(|for\s+\w+\s+in/i.test(code)) {
    approach = "Iterative traversal";
  } else if (/recurs|function\s+\w+\([^)]*\)\s*{[^}]*\1|def\s+\w+\([^)]*\):/i.test(code)) {
    approach = "Recursive approach";
  }

  return {
    approach,
    timeComplexity: "Not confidently inferred",
    spaceComplexity: "Not confidently inferred",
    verdict: failed > 0
      ? `Fails ${failed} of ${answer.total} test case(s). Review edge cases and output formatting.`
      : `Passed all available test cases for ${problem.title}.`,
    confidence
  };
}

async function analyzeSubmission({ problem, answer }) {
  if (process.env.AI_ANALYSIS_ENABLED === "false") {
    return undefined;
  }

  return buildAnalysis({ problem, answer });
}

module.exports = { analyzeSubmission };

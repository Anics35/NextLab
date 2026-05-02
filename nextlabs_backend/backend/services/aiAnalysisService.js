const axios = require("axios");

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const MAX_CODE_CHARS = 12000;

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

  const mistakeHint = failed > 0
    ? "Likely issues include missed edge cases, incorrect branching, or output formatting mistakes."
    : "No obvious correctness mistake was observed from available tests.";

  return {
    approach,
    timeComplexity: "Not confidently inferred",
    spaceComplexity: "Not confidently inferred",
    verdict: failed > 0
      ? `Fails ${failed} of ${answer.total} test case(s). ${mistakeHint}`
      : `Passed all available test cases for ${problem.title}. ${mistakeHint}`,
    confidence
  };
}

function buildPrompt({ problem, answer }) {
  const failed = Math.max((answer.total || 0) - (answer.passed || 0), 0);
  const testSummary = {
    passed: answer.passed || 0,
    total: answer.total || 0,
    failed,
    marks: answer.marks || 0,
    score: answer.score || 0
  };

  return [
    "Analyze this student code for a teacher after an exam submission.",
    "Do not provide a full corrected solution.",
    "Do not suggest marks or change scoring.",
    "Return only strict JSON with these keys:",
    "approach, timeComplexity, spaceComplexity, verdict, confidence.",
    "verdict must mention the primary mistake when the solution is not fully correct.",
    "confidence must be a number from 0 to 100.",
    "",
    `Problem title: ${problem.title}`,
    `Problem description: ${problem.description}`,
    `Difficulty: ${problem.difficulty}`,
    `Judge0 test summary: ${JSON.stringify(testSummary)}`,
    "",
    "Student code:",
    String(answer.code || "").slice(0, MAX_CODE_CHARS)
  ].join("\n");
}

function parseAnalysis(content) {
  const text = String(content || "").trim();

  try {
    return JSON.parse(text);
  } catch (error) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw error;
    }

    return JSON.parse(jsonMatch[0]);
  }
}

function normalizeAnalysis(analysis, fallback) {
  return {
    approach: String(analysis.approach || fallback.approach),
    timeComplexity: String(analysis.timeComplexity || fallback.timeComplexity),
    spaceComplexity: String(analysis.spaceComplexity || fallback.spaceComplexity),
    verdict: String(analysis.verdict || fallback.verdict),
    confidence: Math.max(0, Math.min(100, Number(analysis.confidence || fallback.confidence))),
    source: "groq"
  };
}

async function analyzeWithGroq({ problem, answer }) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return undefined;
  }

  const response = await axios.post(
    `${GROQ_BASE_URL}/chat/completions`,
    {
      model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
      temperature: 0.2,
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content: "You are a concise exam-code reviewer for teachers. Return only valid JSON and never reveal a full solution."
        },
        {
          role: "user",
          content: buildPrompt({ problem, answer })
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 15000
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  return parseAnalysis(content);
}

async function analyzeSubmission({ problem, answer }) {
  if (process.env.AI_ANALYSIS_ENABLED === "false") {
    return undefined;
  }

  const fallback = {
    ...buildAnalysis({ problem, answer }),
    source: "heuristic"
  };

  try {
    const groqAnalysis = await analyzeWithGroq({ problem, answer });
    if (!groqAnalysis) {
      return fallback;
    }

    return normalizeAnalysis(groqAnalysis, fallback);
  } catch (error) {
    console.warn("Groq AI analysis failed:", error.response?.data?.error?.message || error.message);
    return fallback;
  }
}

module.exports = { analyzeSubmission, buildAnalysis };

const axios = require("axios");

const SUPPORTED_LANGUAGES = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50
};

const LANGUAGE_IDS = {
  ...SUPPORTED_LANGUAGES,
  js: SUPPORTED_LANGUAGES.javascript,
  py: SUPPORTED_LANGUAGES.python,
  "c++": SUPPORTED_LANGUAGES.cpp
};

function getJudge0Headers() {
  const headers = { "Content-Type": "application/json" };

  if (process.env.JUDGE0_API_KEY) {
    headers["X-RapidAPI-Key"] = process.env.JUDGE0_API_KEY;
    headers["X-RapidAPI-Host"] = process.env.JUDGE0_API_HOST || "judge0-ce.p.rapidapi.com";
  }

  return headers;
}

function getLanguageId(language) {
  const id = LANGUAGE_IDS[String(language).toLowerCase()];

  if (!id) {
    const error = new Error(`Unsupported language: ${language}`);
    error.status = 400;
    error.code = "UNSUPPORTED_LANGUAGE";
    throw error;
  }

  return id;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCode(language, code, input = "") {
  const baseUrl = process.env.JUDGE0_BASE_URL || "https://judge0-ce.p.rapidapi.com";
  const languageId = getLanguageId(language);
  const headers = getJudge0Headers();

  try {
    const submissionResponse = await axios.post(
      `${baseUrl}/submissions?base64_encoded=false&wait=false`,
      {
        language_id: languageId,
        source_code: code,
        stdin: input
      },
      { headers }
    );

    const token = submissionResponse.data.token;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await sleep(1000);

      const resultResponse = await axios.get(
        `${baseUrl}/submissions/${token}?base64_encoded=false`,
        { headers }
      );

      const result = resultResponse.data;
      const statusId = result.status && result.status.id;

      if (statusId > 2) {
        return {
          output: result.stdout || "",
          error: result.stderr || result.compile_output || result.message || "",
          status: result.status
        };
      }
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      const authError = new Error("Judge0 authentication failed. Add a valid JUDGE0_API_KEY in .env or use a Judge0 server that does not require RapidAPI.");
      authError.status = 401;
      authError.code = "JUDGE0_AUTH_FAILED";
      throw authError;
    }

    if (error.response && error.response.status === 403) {
      const permissionError = new Error("Judge0 access forbidden. Check that your RapidAPI key is subscribed to Judge0 CE, the quota is available, and JUDGE0_API_HOST matches the selected Judge0 API.");
      permissionError.status = 403;
      permissionError.code = "JUDGE0_FORBIDDEN";
      throw permissionError;
    }

    throw error;
  }

  const error = new Error("Judge0 execution timed out");
  error.status = 504;
  throw error;
}

module.exports = { LANGUAGE_IDS, SUPPORTED_LANGUAGES, runCode };

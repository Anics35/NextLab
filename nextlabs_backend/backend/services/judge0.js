const axios = require("axios");

const PUBLIC_JUDGE0_BASE_URL = "https://ce.judge0.com";
const RETRYABLE_STATUS_CODES = new Set([429, 503]);
const BATCH_FIELDS = "token,stdout,stderr,compile_output,message,status_id";

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

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "").replace(/\/+$/, "");
}

function isRapidApiJudge0(baseUrl) {
  return /rapidapi/i.test(baseUrl) || /judge0-ce\.p\.rapidapi\.com/i.test(baseUrl);
}

function getConfiguredBaseUrl() {
  return normalizeBaseUrl(
    process.env.JUDGE0_BASE_URL || (process.env.JUDGE0_API_KEY ? "https://judge0-ce.p.rapidapi.com" : PUBLIC_JUDGE0_BASE_URL)
  );
}

function getJudge0HeadersForBaseUrl(baseUrl) {
  const headers = { "Content-Type": "application/json" };

  if (isRapidApiJudge0(baseUrl) && process.env.JUDGE0_API_KEY) {
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

async function requestWithRetry(operation, { retries = 2, delayMs = 1000 } = {}) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;

      if (!RETRYABLE_STATUS_CODES.has(status) || attempt === retries) {
        throw error;
      }

      await sleep(delayMs * (attempt + 1));
    }
  }

  throw lastError;
}

function createJudge0Error(status, code, message, cause) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.cause = cause;
  return error;
}

function normalizeJudge0Failure(error) {
  const status = error?.response?.status || error?.status;

  if (status === 401) {
    return createJudge0Error(
      401,
      "JUDGE0_AUTH_FAILED",
      "Judge0 authentication failed. Add a valid JUDGE0_API_KEY in .env or use a Judge0 server that does not require RapidAPI.",
      error
    );
  }

  if (status === 403) {
    return createJudge0Error(
      403,
      "JUDGE0_FORBIDDEN",
      "Judge0 access forbidden. Check that your RapidAPI key is subscribed to Judge0 CE, the quota is available, and JUDGE0_API_HOST matches the selected Judge0 API.",
      error
    );
  }

  if (status === 429) {
    return createJudge0Error(
      429,
      "JUDGE0_RATE_LIMITED",
      "Judge0 is temporarily rate limited. Please try submitting again in a moment.",
      error
    );
  }

  if (status === 503) {
    return createJudge0Error(
      503,
      "JUDGE0_QUEUE_FULL",
      "Judge0 queue is busy right now. Please try submitting again in a moment.",
      error
    );
  }

  return error;
}

async function createSingleSubmission(baseUrl, headers, languageId, code, input) {
  const response = await requestWithRetry(() => axios.post(
    `${baseUrl}/submissions`,
    {
      language_id: languageId,
      source_code: code,
      stdin: input
    },
    {
      headers,
      params: {
        base64_encoded: false,
        wait: false
      }
    }
  ));

  const token = response.data?.token;
  if (!token) {
    throw createJudge0Error(500, "JUDGE0_EMPTY_TOKEN", "Judge0 did not return a submission token.", response);
  }

  return token;
}

async function pollSingleSubmission(baseUrl, headers, token) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await sleep(1000);

    const response = await requestWithRetry(() => axios.get(
      `${baseUrl}/submissions/${token}`,
      {
        headers,
        params: {
          base64_encoded: false,
          fields: BATCH_FIELDS
        }
      }
    ));

    const result = response.data || {};
    const statusId = Number(result.status_id ?? result.status?.id ?? 0);

    if (statusId > 2) {
      return {
        output: result.stdout || "",
        error: result.stderr || result.compile_output || result.message || "",
        status: result.status || { id: statusId }
      };
    }
  }

  throw createJudge0Error(504, "JUDGE0_TIMEOUT", "Judge0 execution timed out.");
}

async function createBatchSubmissions(baseUrl, headers, languageId, code, inputs) {
  const response = await requestWithRetry(() => axios.post(
    `${baseUrl}/submissions/batch`,
    {
      submissions: inputs.map((input) => ({
        language_id: languageId,
        source_code: code,
        stdin: input
      }))
    },
    {
      headers,
      params: {
        base64_encoded: false
      }
    }
  ));

  const submitted = Array.isArray(response.data) ? response.data : response.data?.submissions;
  if (!Array.isArray(submitted) || submitted.length !== inputs.length) {
    throw createJudge0Error(500, "JUDGE0_BATCH_CREATE_FAILED", "Judge0 batch submission did not return the expected number of tokens.", response.data);
  }

  const invalidItems = submitted.filter((item) => !item || !item.token);
  if (invalidItems.length > 0) {
    const error = createJudge0Error(400, "JUDGE0_BATCH_VALIDATION_FAILED", "Judge0 rejected one or more submissions in the batch.", invalidItems);
    error.details = invalidItems;
    throw error;
  }

  return submitted.map((item) => String(item.token));
}

async function pollBatchSubmissions(baseUrl, headers, tokens) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await sleep(1000);

    const response = await requestWithRetry(() => axios.get(
      `${baseUrl}/submissions/batch`,
      {
        headers,
        params: {
          tokens: tokens.join(","),
          base64_encoded: false,
          fields: BATCH_FIELDS
        }
      }
    ));

    const submissions = Array.isArray(response.data?.submissions)
      ? response.data.submissions
      : Array.isArray(response.data)
        ? response.data
        : [];

    const byToken = new Map(submissions.map((item) => [String(item.token), item]));
    const allDone = tokens.every((token) => Number(byToken.get(token)?.status_id ?? byToken.get(token)?.status?.id ?? 0) > 2);

    if (allDone) {
      return tokens.map((token) => {
        const item = byToken.get(token) || {};
        const statusId = Number(item.status_id ?? item.status?.id ?? 0);
        return {
          output: item.stdout || "",
          error: item.stderr || item.compile_output || item.message || "",
          status: item.status || { id: statusId }
        };
      });
    }
  }

  throw createJudge0Error(504, "JUDGE0_TIMEOUT", "Judge0 batch execution timed out.");
}

async function executeSingleSubmission(baseUrl, languageId, code, input) {
  const headers = getJudge0HeadersForBaseUrl(baseUrl);
  const token = await createSingleSubmission(baseUrl, headers, languageId, code, input);
  return pollSingleSubmission(baseUrl, headers, token);
}

async function executeBatchSubmission(baseUrl, languageId, code, inputs) {
  const headers = getJudge0HeadersForBaseUrl(baseUrl);
  const tokens = await createBatchSubmissions(baseUrl, headers, languageId, code, inputs);
  return pollBatchSubmissions(baseUrl, headers, tokens);
}

async function runWithFallback(baseUrl, runner) {
  try {
    return await runner(baseUrl);
  } catch (error) {
    const status = error?.response?.status || error?.status;

    if (isRapidApiJudge0(baseUrl) && [401, 403, 429].includes(status)) {
      console.warn(`Judge0 request failed with ${status}; falling back to the public Judge0 CE endpoint.`);
      try {
        return await runner(PUBLIC_JUDGE0_BASE_URL);
      } catch (fallbackError) {
        throw normalizeJudge0Failure(fallbackError);
      }
    }

    throw normalizeJudge0Failure(error);
  }
}

async function runCode(language, code, input = "") {
  const baseUrl = getConfiguredBaseUrl();
  const languageId = getLanguageId(language);

  return runWithFallback(baseUrl, (targetBaseUrl) => executeSingleSubmission(targetBaseUrl, languageId, code, input));
}

async function runCodeBatch(language, code, inputs = []) {
  const baseUrl = getConfiguredBaseUrl();
  const languageId = getLanguageId(language);
  const safeInputs = Array.isArray(inputs) ? inputs.map((input) => String(input || "")) : [];

  if (safeInputs.length === 0) {
    return [];
  }

  return runWithFallback(baseUrl, (targetBaseUrl) => executeBatchSubmission(targetBaseUrl, languageId, code, safeInputs));
}

module.exports = { LANGUAGE_IDS, SUPPORTED_LANGUAGES, runCode, runCodeBatch };

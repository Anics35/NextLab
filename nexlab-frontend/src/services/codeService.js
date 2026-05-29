import api from './api';

export const runCode = async (language, code, input) => {
  try {
    const response = await api.post('/run', { language, code, input });
    return response.data; // { success, output, error, status }
  } catch (error) {
    const resp = error?.data || error?.response?.data || {};
    const payload = typeof resp === 'object' && resp !== null ? resp : {};
    const errorText = payload.error || payload.message || error?.message || 'Run failed';
    const stdout = payload.output || payload.stdout || payload.stdout_text || '';
    const stderr = payload.stderr || payload.compile_output || payload.compileOutput || payload.error || errorText;

    return {
      success: payload.success === undefined ? false : payload.success,
      output: stdout,
      error: stderr,
      status: payload.status || error?.status || error?.response?.status,
      code: payload.code || error?.code,
      message: errorText,
      raw: payload
    };
  }
};

export const submitCode = async (problemId, language, code) => {
  const response = await api.post('/submit', { problemId, language, code });
  return response.data; // Returns { success, submissionId, total, passed, failed, details }
};

export const getProblems = async () => {
  const response = await api.get('/problem/all');
  return response.data.problems; // Returns list of problems
};

export const getActivityLogs = async (limit = 100) => {
  const response = await api.get(`/activity?limit=${limit}`);
  return response.data.events; // Returns { studentId, type, severity, message, meta }
};

export const getAllSubmissions = async (limit = 50) => {
  const response = await api.get(`/submissions?limit=${limit}`);
  return response.data.submissions; // Returns list of student submissions with results
};

export const createProblem = async (problemData) => {
  // problemData will include title, description, difficulty, and testCases array
  const response = await api.post('/problem/create', problemData);
  return response.data;
};

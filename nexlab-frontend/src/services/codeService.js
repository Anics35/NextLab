import api from './api';

export const runCode = async (language, code, input) => {
  const response = await api.post('/run', { language, code, input });
  return response.data; // Returns { success, output, error, status }
};

export const submitCode = async (problemId, language, code) => {
  const response = await api.post('/submit', { problemId, language, code });
  return response.data; // Returns { success, submissionId, total, passed, failed, details }
};

export const getProblems = async () => {
  const response = await api.get('/problems');
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
  const response = await api.post('/problems', problemData);
  return response.data;
};
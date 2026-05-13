import axios from 'axios';

const API_URL = 'http://localhost:5001';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  fallbackMessage;

const request = async (promise, fallbackMessage) => {
  try {
    const response = await promise;
    console.log('[API] success:', response.config?.method?.toUpperCase(), response.config?.url, response.data);
    return response.data;
  } catch (error) {
    console.error('[API] error:', error?.config?.method?.toUpperCase(), error?.config?.url, error?.response?.data || error.message);
    throw new Error(getErrorMessage(error, fallbackMessage), { cause: error });
  }
};

export const joinCourse = (courseCode) =>
  request(api.post('/course/join', { courseCode }), 'Unable to join course.');

export const createCourse = (payload) =>
  request(api.post('/course/create', payload), 'Unable to create course.');

export const getMyCourses = () =>
  request(api.get('/course/my'), 'Unable to load courses.');

export const getCourseById = (courseId) =>
  request(api.get(`/course/${courseId}`), 'Unable to load course details.');

export const updateCourse = (courseId, payload) =>
  request(api.put(`/course/${courseId}`, payload), 'Unable to update course.');

export const getCourseExams = (courseId) =>
  request(api.get(`/exam/course/${courseId}`), 'Unable to load course exams.');

export const getExamById = (examId) =>
  request(api.get(`/exam/${examId}`), 'Unable to load exam.');

export const updateExam = (examId, payload) =>
  request(api.put(`/exam/${examId}`, payload), 'Unable to update exam.');

export const createExam = (payload) =>
  request(api.post('/exam/create', payload), 'Unable to publish exam.');

export const createProblem = (payload) =>
  request(api.post('/problems', payload), 'Unable to create problem.');

export const updateProblem = (problemId, payload) =>
  request(api.put(`/problems/${problemId}`, payload), 'Unable to update problem.');

export const deleteProblem = (problemId) =>
  request(api.delete(`/problems/${problemId}`), 'Unable to delete problem.');

export const startExamAttempt = (examId) =>
  request(api.post('/exam-attempts/start', { examId }), 'Unable to start exam attempt.');

export const getMyAttempt = (examId) =>
  request(api.get(`/exam-attempts/${examId}/me`), 'Unable to load exam attempt.');

export const getStudentAttempt = (examId, studentId) =>
  request(api.get(`/exam-attempts/${examId}/student/${studentId}`), 'Unable to load student attempt.');

export const submitExamAnswer = ({ examId, problemId, code, language, input = '', finalSubmit = false }) =>
  request(
    api.post('/exam-attempts/submit', { examId, problemId, code, language, input, finalSubmit }),
    'Unable to submit exam answer.'
  );

export const finalizeExamAttempt = (examId) =>
  request(api.post('/exam-attempts/finalize', { examId }), 'Unable to finalize exam.');

export const saveExamAttempt = ({ examId, problemId, code, language, currentProblemIndex }) =>
  request(
    api.post('/exam-attempts/save', { examId, problemId, code, language, currentProblemIndex }),
    'Unable to save exam progress.'
  );

export const getTeacherSubmissions = ({ examId, limit = 50 } = {}) =>
  request(
    api.get('/submissions', { params: { examId, limit } }),
    'Unable to load submissions.'
  );

export const getSubmissionsByExam = (examId, limit = 100) =>
  request(
    api.get(`/submissions/exam/${examId}`, { params: { limit } }),
    'Unable to load exam submissions.'
  );

export const overrideSubmissionScore = (submissionId, problemId, score) =>
  request(
    api.put(`/submission/${submissionId}/problem/${problemId}/score`, { score }),
    'Unable to override submission score.'
  );

export const getExamAnalytics = (examId, params = {}) =>
  request(
    api.get(`/analytics/exam/${examId}`, { params }),
    'Unable to load analytics.'
  );

export const getProctorEventsByExam = (examId) =>
  request(
    api.get(`/proctor/exam/${examId}`),
    'Unable to load proctor events.'
  );

export const getActivityByStudent = (studentId, filters = {}) =>
  request(
    api.get(`/activity`, { params: { studentId, ...filters } }),
    'Unable to load student activity.'
  );

export default api;

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
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
    const message = getErrorMessage(error, fallbackMessage);
    const wrappedError = new Error(message, { cause: error });
    wrappedError.status = error?.response?.status;
    wrappedError.code = error?.response?.data?.code || error?.code;
    wrappedError.response = error?.response;
    wrappedError.data = error?.response?.data;
    throw wrappedError;
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

export const deleteCourse = (courseId) =>
  request(api.delete(`/course/${courseId}`), 'Unable to delete course.');

export const getCourseExams = (courseId) =>
  request(api.get(`/exam/course/${courseId}`), 'Unable to load course exams.');

export const getExamById = (examId) =>
  request(api.get(`/exam/${examId}`), 'Unable to load exam.');

export const updateExam = (examId, payload) =>
  request(api.put(`/exam/${examId}`, payload), 'Unable to update exam.');

export const createExam = (payload) =>
  request(api.post('/exam/create', payload), 'Unable to publish exam.');

export const deleteExam = (examId) =>
  request(api.delete(`/exam/${examId}`), 'Unable to delete exam.');

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

export const downloadExamReportPdf = async (examId) => {
  const response = await api.get(`/results/exam/${examId}/pdf`, { responseType: 'blob' });
  return response.data;
};

export const downloadExamReportXlsx = async (examId) => {
  const response = await api.get(`/results/exam/${examId}/xlsx`, { responseType: 'blob' });
  return response.data;
};

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

export const updateProfile = (payload) =>
  request(
    api.put('/auth/profile', payload),
    'Unable to update profile.'
  );

export const getEnrolledStudents = (examId) =>
  request(
    api.get(`/exam/${examId}/enrolled-students`),
    'Unable to load enrolled students.'
  );

export const updateExamVisibility = (examId, visibleToStudents) =>
  request(
    api.put(`/exam/${examId}/update-visibility`, { visibleToStudents }),
    'Unable to update exam visibility.'
  );

export const removeStudentFromCourse = (courseId, studentId) =>
  request(
    api.delete(`/course/${courseId}/student/${studentId}`),
    'Unable to remove student from course.'
  );

export const getAdminSummary = () =>
  request(api.get('/admin/summary'), 'Unable to load admin summary.');

export const getAdminUsers = () =>
  request(api.get('/admin/users'), 'Unable to load users.');

export const deleteAdminUser = (userId) =>
  request(api.delete(`/admin/users/${userId}`), 'Unable to delete user.');

export const getAdminUserActivity = (userId) =>
  request(api.get(`/admin/users/${userId}/activity`), 'Unable to load account activity.');

export const setAdminUserDisabled = (userId, disabled) =>
  request(api.patch(`/admin/users/${userId}/disable`, { disabled }), 'Unable to update account status.');

export const getAdminCourses = () =>
  request(api.get('/admin/courses'), 'Unable to load courses.');

export const deleteAdminCourse = (courseId) =>
  request(api.delete(`/admin/courses/${courseId}`), 'Unable to delete course.');

export const setAdminCourseArchived = (courseId, archived) =>
  request(api.patch(`/admin/courses/${courseId}/archive`, { archived }), 'Unable to update course archive status.');

export const getAdminExams = () =>
  request(api.get('/admin/exams'), 'Unable to load exams.');

export const deleteAdminExam = (examId) =>
  request(api.delete(`/admin/exams/${examId}`), 'Unable to delete exam.');

export const setAdminExamHidden = (examId, hidden) =>
  request(api.patch(`/admin/exams/${examId}/hide`, { hidden }), 'Unable to update exam visibility.');

export const getAdminAnalytics = () =>
  request(api.get('/admin/monitoring/analytics'), 'Unable to load platform analytics.');

export const getAdminProctorLogs = () =>
  request(api.get('/admin/monitoring/proctor-logs'), 'Unable to load proctor logs.');

export const getAdminActivityLogs = () =>
  request(api.get('/admin/monitoring/activity-logs'), 'Unable to load activity logs.');

export const getAdminSubmissions = () =>
  request(api.get('/admin/monitoring/submissions'), 'Unable to load submissions.');

export const getAdminReports = () =>
  request(api.get('/admin/monitoring/reports'), 'Unable to load reports.');

export const downloadAdminReports = async () => {
  const response = await api.get('/admin/monitoring/reports/download', { responseType: 'blob' });
  return response.data;
};

export const downloadAdminExamReportPdf = async (examId) => {
  const response = await api.get(`/results/exam/${examId}/pdf`, { responseType: 'blob' });
  return response.data;
};

export const downloadAdminExamReportXlsx = async (examId) => {
  const response = await api.get(`/results/exam/${examId}/xlsx`, { responseType: 'blob' });
  return response.data;
};

export default api;

import api from './api';
import { disconnectSocket } from './socket';

const AUTH_KEYS = ['token', 'user'];
const LOCAL_PAGE_KEYS = [
  'nextlab_active_course',
  'nextlab_current_exam',
  'nextlab_problem_index',
  'nextlab_teacher_active_tab'
];

const persistAuth = ({ token, user }) => {
  if (token) {
    localStorage.setItem('token', token);
    sessionStorage.setItem('token', token);
  }
  if (user) {
    const serializedUser = JSON.stringify(user);
    localStorage.setItem('user', serializedUser);
    sessionStorage.setItem('user', serializedUser);
  }
};

const getAuthValue = (key) => sessionStorage.getItem(key) || localStorage.getItem(key);

export const restoreAuthFromSession = () => {
  AUTH_KEYS.forEach((key) => {
    const value = sessionStorage.getItem(key);
    if (value) localStorage.setItem(key, value);
  });
};

export const getAuthToken = () => {
  restoreAuthFromSession();
  return getAuthValue('token');
};

export const getStoredUser = () => {
  restoreAuthFromSession();
  const savedUser = getAuthValue('user');
  if (!savedUser) return null;

  try {
    return JSON.parse(savedUser);
  } catch {
    return null;
  }
};

export const clearPersistentAuthForTabClose = () => {
  AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
};

export const register = async (userData) => {
  // userData should be { name, email, password, role }
  const response = await api.post('/auth/register', userData);
  if (response.data.token) {
    persistAuth({ token: response.data.token, user: response.data.user });
  }
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  if (response.data.token) {
    persistAuth({ token: response.data.token, user: response.data.user });
  }
  return response.data;
};

// export const logout = () => {
//   localStorage.removeItem('token');
//   localStorage.removeItem('user');
//   window.location.href = '/';
// };

export const logout = () => {
  AUTH_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  LOCAL_PAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  disconnectSocket(); // Kill the socket connection instantly
  window.location.reload(); // Refresh the app to show the login screen
};

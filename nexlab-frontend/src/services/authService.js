import api from './api';
import { disconnectSocket } from './socket';

export const register = async (userData) => {
  // userData should be { name, email, password, role }
  const response = await api.post('/auth/register', userData);
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response.data;
};

// export const logout = () => {
//   localStorage.removeItem('token');
//   localStorage.removeItem('user');
//   window.location.href = '/';
// };

export const logout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  disconnectSocket(); // Kill the socket connection instantly
  window.location.reload(); // Refresh the app to show the login screen
};
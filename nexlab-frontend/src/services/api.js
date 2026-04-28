import axios from 'axios';

const API_URL = 'http://localhost:5001';

const api = axios.create({
  baseURL: API_URL,
});

// Automatically attach the Auth token to every request if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
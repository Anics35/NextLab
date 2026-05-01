import { io } from 'socket.io-client';

// 1. Export the variable so App.jsx and TeacherDashboard can see it immediately
export let socket;

export const initSocket = (token) => {
  // Initialize only if not already initialized
  if (!socket) {
    socket = io('http://localhost:5001', {
      auth: { token },
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('🚀 NexLab Socket Connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket Connection Error:', err.message);
    });
  }
  return socket;
};

// 2. NEW: Disconnect helper for Logout
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null; // Reset so it creates a fresh connection on next login
    console.log('🛑 NexLab Socket Disconnected');
  }
};

// 3. Global helper for manual events
export const emitEvent = (eventType, payload) => {
  if (socket && socket.connected) {
    socket.emit(eventType, payload);
  }
};

// 4. Heartbeat for Monitoring Logic
export const startHeartbeat = (problemId) => {
  return setInterval(() => {
    emitEvent('heartbeat', { 
      problemId, 
      timestamp: new Date().toISOString() 
    });
  }, 20000); 
};
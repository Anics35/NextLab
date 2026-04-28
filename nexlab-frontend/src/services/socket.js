import { io } from 'socket.io-client';

let socket;

export const initSocket = (token) => {
  socket = io('http://localhost:5001', {
    auth: { token }
  });

  return socket;
};

export const emitEvent = (eventType, payload) => {
  if (socket) {
    socket.emit(eventType, payload);
  }
};

// Monitoring helpers
export const startHeartbeat = (problemId) => {
  return setInterval(() => {
    emitEvent('heartbeat', { problemId });
  }, 20000); // Send heartbeat every 20 seconds
};
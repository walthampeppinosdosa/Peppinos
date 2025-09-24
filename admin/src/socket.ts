import { io } from 'socket.io-client';

// Server URL - same server for API and Socket.IO
const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create socket instance following React Socket.IO guide
export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  timeout: 20000,
  forceNew: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  withCredentials: true
});

// Helper function to connect with authentication
export function connectSocket() {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

  if (!token) {
    return false;
  }

  // Set authentication options
  socket.auth = { token };
  socket.io.opts.extraHeaders = {
    'Authorization': `Bearer ${token}`
  };
  socket.io.opts.query = {
    token: token
  };

  // Connect the socket
  socket.connect();

  return true;
}

// Helper function to disconnect socket
export function disconnectSocket() {
  socket.disconnect();
}

// Helper function to join admin room
export function joinAdminRoom() {
  if (socket.connected) {
    socket.emit('joinAdminRoom');
  }
}

// Helper function to leave admin room
export function leaveAdminRoom() {
  if (socket.connected) {
    socket.emit('leaveAdminRoom');
  }
}

let io;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

module.exports = {
  init: (httpServer) => {
    io = require('socket.io')(httpServer, {
      cors: {
        origin: FRONTEND_URL,
        credentials: true
      }
    });
    return io;
  },
  getIO: () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
  }
};
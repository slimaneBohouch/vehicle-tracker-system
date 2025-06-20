const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const User = require('../models/User');

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

    // ✅ Authenticate socket connection using cookies
    io.use(async (socket, next) => {
      try {
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) return next(new Error("No cookie found"));

        const parsed = cookie.parse(cookies);
        const token = parsed.token;
        if (!token) return next(new Error("Token not found in cookie"));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return next(new Error("User not found"));

        socket.user = user;

        // ✅ Join personal room
        socket.join(user._id.toString());

        // ✅ Join 'admins' room if user is admin or superadmin
        if (user.role === 'admin' || user.role === 'superadmin') {
          socket.join('admins');
        }

        next();
      } catch (err) {
        console.error('[Socket Auth Error]', err.message);
        next(new Error("Socket authentication failed"));
      }
    });

    return io;
  },

  getIO: () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
  }
};

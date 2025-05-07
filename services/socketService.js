const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Socket connections mapped to user IDs
const userConnections = new Map();

/**
 * Initialize socket.io server
 * @param {Object} server - HTTP server instance
 */
function initialize(server) {
  const io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  
  // Socket.io middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || 
                   socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }
      
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('User not found'));
      }
      
      // Attach user to socket
      socket.user = {
        id: user._id.toString(),
        email: user.email,
        name: user.name
      };
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error'));
    }
  });
  
  // Handle connections
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id}`);
    
    // Store socket connection for this user
    if (!userConnections.has(socket.user.id)) {
      userConnections.set(socket.user.id, new Set());
    }
    userConnections.get(socket.user.id).add(socket);
    
    // Subscribe to vehicle updates
    socket.on('subscribe_vehicle', (vehicleId) => {
      console.log(`User ${socket.user.id} subscribed to vehicle ${vehicleId}`);
      socket.join(`vehicle:${vehicleId}`);
    });
    
    // Unsubscribe from vehicle updates
    socket.on('unsubscribe_vehicle', (vehicleId) => {
      console.log(`User ${socket.user.id} unsubscribed from vehicle ${vehicleId}`);
      socket.leave(`vehicle:${vehicleId}`);
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
      
      // Remove socket from user connections
      if (userConnections.has(socket.user.id)) {
        const userSockets = userConnections.get(socket.user.id);
        userSockets.delete(socket);
        
        if (userSockets.size === 0) {
          userConnections.delete(socket.user.id);
        }
      }
    });
  });
  
  // Save io instance for later use
  global.io = io;
  
  return io;
}

/**
 * Emit event to specific user
 * @param {String} userId - User ID
 * @param {String} event - Event name
 * @param {Object} data - Event data
 */
function emitToUser(userId, event, data) {
  if (userConnections.has(userId)) {
    const userSockets = userConnections.get(userId);
    for (const socket of userSockets) {
      socket.emit(event, data);
    }
  }
}

/**
 * Emit event to all users subscribed to a vehicle
 * @param {String} vehicleId - Vehicle ID
 * @param {String} event - Event name
 * @param {Object} data - Event data
 */
function emitToVehicleSubscribers(vehicleId, event, data) {
  if (global.io) {
    global.io.to(`vehicle:${vehicleId}`).emit(event, data);
  }
}

module.exports = {
  initialize,
  emitToUser,
  emitToVehicleSubscribers
};
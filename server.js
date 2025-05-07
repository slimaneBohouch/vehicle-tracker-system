const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const colors = require('colors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const errorHandler = require('./middleware/error');
const connectDB = require('./config/db');
const auth = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicleRoutes');
const geofenceRoutes = require('./routes/geofenceRoutes');
const geofenceService = require('./services/geofenceService');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Sanitize data
app.use(mongoSanitize());

// Set security headers
app.use(helmet());

// Prevent XSS attacks
app.use(xss());

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Prevent HTTP param pollution
app.use(hpp());

// Enable CORS
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.options('*', cors());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files with CORS headers
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
  setHeaders: (res, path) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Mount API routes
app.use('/api/v1/auth', auth);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/geofences', geofenceRoutes);

// Error handler middleware
app.use(errorHandler);

// Create HTTP server for Express + Socket.IO
const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
const io = socketIo(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true
  }
});

// WebSocket logic
io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('position_update', async (data) => {
    if (data.vehicleId && data.lat && data.lon) {
      const position = { lat: data.lat, lon: data.lon };
      const insideGeofences = await geofenceService.checkVehicleGeofenceStatus(data.vehicleId, position);

      socket.emit('geofence_status', {
        vehicleId: data.vehicleId,
        insideGeofences: insideGeofences.map(g => ({
          id: g._id,
          name: g.name,
          type: g.type
        }))
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}.`.blue.bold);
  console.log(`Server is now listening for connections...`);
});
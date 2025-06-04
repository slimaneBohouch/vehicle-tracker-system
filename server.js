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
const jwt = require('jsonwebtoken');

const errorHandler = require('./middleware/error');
const connectDB = require('./config/db');
const auth = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicleRoutes');
const geofenceRoutes = require('./routes/geofenceRoutes');
const geofenceService = require('./services/geofenceService');
const User = require('./models/User');
const userRoutes = require('./routes/userRoutes')



dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(mongoSanitize());
app.use(helmet());
app.use(xss());
app.use(rateLimit({ windowMs: 10 * 60 * 1000, max: 100 }));
app.use(hpp());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.options('*', cors());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
  setHeaders: (res, path) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Middleware to attach user from JWT cookie
app.use(async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
  } catch (err) {
    console.error('JWT error:', err);
  }
  next();
});

// Update lastActive if logged in
app.use(async (req, res, next) => {
  if (req.user) {
    const now = new Date();
    const diffMs = now - new Date(req.user.lastActive || 0);
    const threshold = 1000 * 60 * 5;
    if (diffMs > threshold) {
      await User.findByIdAndUpdate(req.user._id, { lastActive: now });
    }
  }
  next();
});

// API Routes
app.use('/api/v1/auth', auth);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/geofences', geofenceRoutes);
app.use('/api/v1/users', userRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
const io = socketIo(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true
  }
});

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

httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.blue.bold);
});

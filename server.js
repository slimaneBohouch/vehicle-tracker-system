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
const jwt = require('jsonwebtoken');
const cron = require("node-cron");
const errorHandler = require('./middleware/error');
const connectDB = require('./config/db');
const auth = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicleRoutes');
const geofenceRoutes = require('./routes/geofenceRoutes');
const userRoutes = require('./routes/userRoutes');
const alertRuleRoutes = require('./routes/alertRuleRoutes');
const geofenceService = require('./services/geofenceService');
const User = require('./models/User');
const socket = require('./Utils/socket');
const immobilizationRoutes = require('./routes/immobilizationRoutes');
const tripRoutes = require('./routes/tripRoutes');
const alertRoutes = require('./routes/alertRoutes');
const statisticsRoutes = require('./routes/statisticsRoutes');
dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(cookieParser());
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));
app.use(mongoSanitize());
app.use(helmet());
app.use(xss());
app.use(rateLimit({ windowMs: 10 * 60 * 1000, max: 100 }));
app.use(hpp());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.options('*', cors());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));


// Routes
app.use('/api/v1/auth', auth);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/geofences', geofenceRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/alert-rules', alertRuleRoutes);
app.use('/api/v1/immobilizations', immobilizationRoutes);
app.use('/api/v1/trips', tripRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/statistics', statisticsRoutes);
app.use(errorHandler);


const closeInactiveTrips = require("./jobs/tripCleanup");
const markInactiveVehicles = require('./jobs/inactiveVehiclesJob');

// Run every 6 minutes
cron.schedule("*/6 * * * *", async () => {
  console.log("🔁 Running cron job to close inactive trips...");
  await closeInactiveTrips();
});

cron.schedule('*/10 * * * *', async () => {
  console.log('[CRON] Checking for inactive vehicles...');
  await markInactiveVehicles();
});


const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
const io = socket.init(httpServer);

const { setupTCPListener } = require('./services/tcpReceiver');
setupTCPListener();

httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.blue.bold);
});
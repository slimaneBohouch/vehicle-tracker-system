const Vehicle = require('../models/Vehicle');
  const User = require('../models/User');
  const catchAsync = require('../utils/catchAsync');
  const AppError = require('../utils/AppError');
  const axios = require('axios');
  const moment = require('moment');
  const socket = require('../Utils/socket');
  const AlertRule = require('../models/AlertRule');
  const Alert = require('../models/Alert');
const geofenceService = require('../services/geofenceService');
const { handleTripTracking } = require('../controllers/tripController');
const { createAlert } = require('../services/alertService');



  // Configuration for external IMEI validation API
  const DEVICES_API_URL = process.env.DEVICES_API_URL || 'http://www.pogog.ovh:5051/devices';

  /**
   * Validates an IMEI number using the external devices API
   * @param {string} imei - The IMEI number to validate
   * @returns {Promise<{valid: boolean, details?: object}>} - Validation result
   */
  const validateIMEI = async (imei) => {
      try {
        // Basic format validation (IMEI is typically 15 digits but could vary)
        if (!/^\d{15,17}$/.test(imei)) {
          return { valid: false, message: 'IMEI must be 15-17 digits' };
        }
    
        // Check with external API - Get all devices first
        const response = await axios.get(DEVICES_API_URL);
    
        // Check if the IMEI exists in the list of devices
        if (response.data && Array.isArray(response.data)) {
          const device = response.data.find(dev => dev.IMEI === imei);
          
          if (device) {
            return { 
              valid: true, 
              details: device
            };
          } else {
            return { 
              valid: false, 
              message: 'IMEI not found in device database'
            };
          }
        } else {
          return { 
            valid: false, 
            message: 'Invalid response from device API'
          };
        }
      } catch (error) {
        console.error('IMEI validation error:', error.message);
        return { 
          valid: false, 
          message: 'Could not validate IMEI: ' + error.message 
        };
      }
    };
    

  /**
   * Add a new vehicle
   * POST /api/v1/vehicles
   */
  exports.addVehicle = catchAsync(async (req, res, next) => {
    try {
      let { imei, name, model, licensePlate } = req.body;
      
      // Normalize IMEI to uppercase
      imei = imei.toUpperCase();
      
      if (!imei) {
        return next(new AppError('Please provide device IMEI', 400));
      }
      
      if (!name || !model || !licensePlate) {
        return next(new AppError('Please provide all required vehicle details', 400));
      }
      
      // Validate IMEI through external API
      const imeiValidation = await validateIMEI(imei);
      
      if (!imeiValidation.valid) {
        return next(new AppError(imeiValidation.message || 'Invalid IMEI number', 400));
      }
      
      // Check if vehicle with this IMEI already exists (by any user)
      const existingVehicle = await Vehicle.findOne({ imei });
      if (existingVehicle) {
        // Check if it belongs to the current user
        if (existingVehicle.user.toString() === req.user.id) {
          return next(new AppError('You already have a vehicle registered with this IMEI', 400));
        } else {
          // IMEI is registered to another user - this is a security concern
          console.log(`Security alert: User ${req.user.id} attempted to register IMEI ${imei} which belongs to user ${existingVehicle.user}`);
          
          // You could add additional security measures here, like:
          // 1. Flag the account for review
          // 2. Send notification to admin
          // 3. Track failed attempts
          
          return next(new AppError('This device IMEI is already registered to another user. This incident has been logged.', 403));
        }
      }
      
      // Check if license plate is already in use
      const existingLicense = await Vehicle.findOne({ licensePlate });
      if (existingLicense) {
        return next(new AppError('This license plate is already registered', 400));
      }
      
      const deviceDetails = imeiValidation.details || {};
      
      console.log('About to create vehicle with data:', {
        imei,
        name: name || deviceDetails.name || 'Unnamed Vehicle',
        model: model || deviceDetails.model || 'Unknown Model',
        licensePlate,
        user: req.user.id,
        currentStatus: deviceDetails.status || 'inactive',
      });
      
      const vehicle = await Vehicle.create({
        imei,
        name: name || deviceDetails.name || 'Unnamed Vehicle',
        model: model || deviceDetails.model || 'Unknown Model',
        licensePlate,
        user: req.user.id,
        currentStatus: deviceDetails.status || 'inactive',
      });
      
      console.log('Vehicle created successfully with ID:', vehicle._id);
      
      // Verify the vehicle was created by immediately querying for it
      const verifyVehicle = await Vehicle.findById(vehicle._id);
      console.log('Verification query result:', verifyVehicle ? 'Found' : 'Not found');
      
      res.status(201).json({
        status: 'success',
        data: {
          vehicle,
        },
      });
    } catch (error) {
      console.error('Error in addVehicle:', error);
      return next(error);
    }
  });
    

  /**
   * Get all vehicles belonging to the current user
   * GET /api/vehicles
   */
  exports.getUserVehicles = catchAsync(async (req, res, next) => {
    let vehicles;

    // Check if the user is an admin
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      // Admins can see all vehicles
      vehicles = await Vehicle.find();
    } else {
      // Regular users can only see their own vehicles
      vehicles = await Vehicle.find({ user: req.user.id });
    }

    res.status(200).json({
      status: 'success',
      results: vehicles.length,
      data: {
        vehicles,
      },
    });
  });

  /**
   * Get a specific vehicle by ID
   * GET /api/vehicles/:id
   */
  exports.getVehicle = catchAsync(async (req, res, next) => {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return next(new AppError('No vehicle found with that ID', 404));
    }

    // Check if the vehicle belongs to the current user
    if (vehicle.user.toString() !== req.user.id) {
      return next(new AppError('You do not have permission to access this vehicle', 403));
    }

    res.status(200).json({
      status: 'success',
      data: {
        vehicle
      }
    });
  });

  /**
   * Update vehicle details
   * PATCH /api/vehicles/:id
   */
  exports.updateVehicle = catchAsync(async (req, res, next) => {
    const { name, model, licensePlate } = req.body;
    
    // Don't allow IMEI updates for security reasons
    if (req.body.imei) {
      return next(new AppError('IMEI cannot be updated for security reasons', 400));
    }

    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return next(new AppError('No vehicle found with that ID', 404));
    }

    // Check if the vehicle belongs to the current user
    if (vehicle.user.toString() !== req.user.id) {
      return next(new AppError('You do not have permission to modify this vehicle', 403));
    }

    // Check if license plate is already in use by another vehicle
    if (licensePlate && licensePlate !== vehicle.licensePlate) {
      const existingLicense = await Vehicle.findOne({ licensePlate });
      if (existingLicense && existingLicense.id !== req.params.id) {
        return next(new AppError('This license plate is already registered', 400));
      }
    }

    // Update vehicle
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { name, model, licensePlate },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        vehicle: updatedVehicle
      }
    });
  });

  /**
   * Delete a vehicle
   * DELETE /api/vehicles/:id
   */
  exports.deleteVehicle = catchAsync(async (req, res, next) => {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return next(new AppError('No vehicle found with that ID', 404));
    }

    // Check if the vehicle belongs to the current user
    if (vehicle.user.toString() !== req.user.id) {
      return next(new AppError('You do not have permission to delete this vehicle', 403));
    }

    await Vehicle.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  });

  /**
   * Get vehicle statistics
   * GET /api/vehicles/stats
   */
  exports.getVehicleStats = catchAsync(async (req, res, next) => {
    let total, lastMonthCount, currentMonthCount, activeVehicles, movingVehicles, idleVehicles;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    // Date ranges
    const lastMonthStart = moment().subtract(1, 'month').startOf('month').toDate();
    const lastMonthEnd = moment().subtract(1, 'month').endOf('month').toDate();
    const currentMonthStart = moment().startOf('month').toDate();
    const now = moment().toDate();

    const baseQuery = isAdmin ? {} : { user: userId };

    total = await Vehicle.countDocuments(baseQuery);

    lastMonthCount = await Vehicle.countDocuments({
      ...baseQuery,
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
    });

    currentMonthCount = await Vehicle.countDocuments({
      ...baseQuery,
      createdAt: { $gte: currentMonthStart, $lte: now },
    });

    activeVehicles = await Vehicle.countDocuments({
      ...baseQuery,
      currentStatus: { $in: ['moving', 'stopped'] }
    });

    movingVehicles = await Vehicle.countDocuments({
      ...baseQuery,
      currentStatus: 'moving'
    });

    idleVehicles = await Vehicle.countDocuments({
      ...baseQuery,
      currentStatus: 'inactive'
    });

    const rawDiff = currentMonthCount - lastMonthCount;
    const difference = `${rawDiff >= 0 ? '+' : '-'}${Math.abs(rawDiff)}`;

    res.status(200).json({
      status: 'success',
      data: {
        total,
        lastMonthCount,
        currentMonthCount,
        difference,
        activeVehicles,
        movingVehicles,
        idleVehicles,
      },
    });
  });

exports.handleLiveVehicleData = async (data) => {
  try {
    const { IMEI, lat, lon, speedGps, ignition, gpsTimestamp, extendedData } = data;

    if (!IMEI || !lat || !lon) {
      return console.warn("Invalid GPS data", data);
    }

    const vehicle = await Vehicle.findOne({ imei: IMEI }).populate('user');
    if (!vehicle) return console.warn(`Vehicle not found: ${IMEI}`);

    const rawIgnition = ignition !== undefined ? ignition : extendedData?.DIN1;
    const isIgnitionOn = ['1', 1, true, 'true'].includes(rawIgnition);
    const isMoving = isIgnitionOn && speedGps > 0;
    const timestamp = gpsTimestamp ? new Date(gpsTimestamp) : new Date();

    // Skip status update if immobilized
    if (vehicle.currentStatus !== 'immobilized') {
      const rawBattery = extendedData?.vehicleBattery;
      const battery = rawBattery !== undefined ? Number(rawBattery) : null;
      const isBatteryDead = battery === null || isNaN(battery) || battery === 0;

      vehicle.currentStatus = isBatteryDead
        ? 'inactive'
        : isMoving
        ? 'moving'
        : isIgnitionOn
        ? 'stopped'
        : 'inactive';
    }

    vehicle.lastPosition = {
      lat,
      lon,
      speed: speedGps || 0,
      timestamp,
      ignition: isIgnitionOn,
    };
    vehicle.extendedData = extendedData;
    await vehicle.save();

    // Socket instance
    const io = socket.getIO();

    // Helper to emit alerts
    function emitAlertToClients(type, message, data = {}) {
      const alertPayload = {
        vehicleId: vehicle._id,
        vehicleName: vehicle.name,
        vehiclePlate: vehicle.licensePlate,
        type,
        message,
        timestamp: new Date(),
        data,
      };
      io.to(vehicle.user._id.toString()).emit('alert', alertPayload);
      io.to('admins').emit('alert', { ...alertPayload, user: vehicle.user });
    }

    // Fetch enabled alert rules
    const alertRules = await AlertRule.find({ enabled: true });

    for (const rule of alertRules) {
      switch (rule.type) {
        case 'SPEED_ALERT':
          if (speedGps > rule.threshold) {
            const message = `Speed exceeded ${rule.threshold} km/h`;
            await createAlert(vehicle, 'SPEED_ALERT', message, { speed: speedGps });
            emitAlertToClients('SPEED_ALERT', message, { speed: speedGps });
          }
          break;

        case 'BATTERY_ALERT': {
          const voltage = Number(extendedData?.vehicleBattery || 0);

          if (voltage >= rule.threshold) {
            await Alert.updateMany(
              { vehicleId: vehicle._id, type: 'BATTERY_ALERT', resolved: false },
              { resolved: true, resolvedAt: new Date() }
            );
          } else if (voltage < rule.threshold) {
            const message = `Battery low: ${voltage}%`;
            await createAlert(vehicle, 'BATTERY_ALERT', message, { battery: voltage });
            emitAlertToClients('BATTERY_ALERT', message, { battery: voltage });
          }
          break;
        }

        // GEOFENCE alerts will be handled after geofence check
        case 'GEOFENCE_EXIT':
        case 'GEOFENCE_ENTRY':
          // You can implement logic after geofence status below
          break;

        default:
          break;
      }
    }

    // Track trip
    await handleTripTracking(vehicle, {
      lat,
      lon,
      speedGps,
      ignition: isIgnitionOn,
      gpsTimestamp: timestamp,
      extendedData,
    });

    // Geofence check
    const insideGeofences = await geofenceService.checkVehicleGeofenceStatus(vehicle._id, { lat, lon });

    // Emit live position
    const payload = {
      vehicleId: vehicle._id,
      imei: IMEI,
      lat,
      lon,
      speed: speedGps,
      ignition: isIgnitionOn,
      timestamp,
      extendedData,
      insideGeofences: insideGeofences.map((g) => ({
        id: g._id,
        name: g.name,
        type: g.type,
      })),
    };

    io.to(vehicle.user._id.toString()).emit('vehicle_data', payload);
    io.to('admins').emit('vehicle_data', payload);
  } catch (err) {
    console.error('[TCP] Live Vehicle Data Error:', err.message);
  }
};



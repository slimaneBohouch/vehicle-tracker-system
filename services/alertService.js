const Alert = require('../models/Alert');

exports.createAlert = async function(vehicle, type, message, data = {}) {
  try {
    // 1. Avoid repeated unresolved alerts for same vehicle and type
    const existing = await Alert.findOne({
      vehicleId: vehicle._id,
      type,
      resolved: false
    });
   // If an unresolved alert already exists, do not create a new one
    if (existing) {
      return;
    }

    // 2. Create new alert
    await Alert.create({    
      vehicleId: vehicle._id,
      type,
      message,
      data,
      timestamp: new Date()
    });

    console.log(`[ALERT] ${type} triggered for vehicle ${vehicle.name}`);
  } catch (err) {
    console.error('[ALERT] Error creating alert:', err.message);
  }
};


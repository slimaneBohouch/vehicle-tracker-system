const Alert = require('../models/Alert');
const geocodingService = require('../services/geocodingService');

exports.createAlert = async function (vehicle, type, message, data = {}) {
  try {
    // 1. Avoid repeated unresolved alerts for same vehicle and type
    const existing = await Alert.findOne({
      vehicleId: vehicle._id,
      type,
      resolved: false
    });

    if (existing) {
      return;
    }

    // 2. Try to get GPS coordinates from data (flexible support)
    const lat = data.lat || data?.location?.lat;
    const lon = data.lon || data?.location?.lon;

    let location = null;

    if (lat && lon) {
      location = await geocodingService.reverseGeocode(lat, lon);
    }

    // 3. Create new alert with location if available
    await Alert.create({
      vehicleId: vehicle._id,
      type,
      message,
      data,
      timestamp: new Date(),
      location,
    });

    console.log(`[ALERT] ${type} triggered for vehicle ${vehicle.name}`);
  } catch (err) {
    console.error('[ALERT] Error creating alert:', err.message);
  }
};

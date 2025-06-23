const Alert = require('../models/Alert');
const geocodingService = require('../services/geocodingService');
const socket = require('../Utils/socket');

exports.createAlert = async function (vehicle, type, message, data = {}) {
  try {
    // Vérifie s'il existe déjà une alerte non résolue de ce type
    const existing = await Alert.findOne({
      vehicleId: vehicle._id,
      type,
      resolved: false,
    });

    if (existing) return;

    // Extraction latitude/longitude
    const lat = data.lat || data?.location?.lat;
    const lon = data.lon || data?.location?.lon;

    let location = null;
    if (lat && lon) {
      location = await geocodingService.reverseGeocode(lat, lon);
    }

    // Création et sauvegarde de l’alerte
    const alertDoc = await Alert.create({
      vehicleId: vehicle._id,
      type,
      message,
      data,
      timestamp: new Date(),
      location,
    });

    console.log(`[ALERT] ${type} triggered for ${vehicle.name}`);

    // Envoi via Socket.IO
    const io = socket.getIO();
    const alertPayload = {
      vehicleId: vehicle._id,
      vehicleName: vehicle.name,
      vehiclePlate: vehicle.licensePlate,
      type,
      message,
      timestamp: alertDoc.timestamp,
      location: location || 'Unknown location',
      data,
    };

    io.to(vehicle.user._id.toString()).emit('alert', alertPayload);
    io.to('admins').emit('alert', { ...alertPayload, user: vehicle.user });

  } catch (err) {
    console.error('[ALERT] Error creating alert:', err.message);
  }
};

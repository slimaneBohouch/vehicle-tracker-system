const Geofence = require('../models/Geofence');
const Vehicle = require('../models/Vehicle');
const geoUtils = require('../utils/geoUtils');
const { createAlert } = require('./alertService');

exports.checkVehicleGeofenceStatus = async (vehicleId, position, updateVehicle = true) => {
  try {
    const vehicle = await Vehicle.findById(vehicleId).populate('user');
    if (!vehicle) throw new Error(`Vehicle not found with id ${vehicleId}`);

    const geofences = await Geofence.find({ vehicles: vehicleId, active: true });
    const previousStatus = vehicle.lastGeofenceStatus || new Map();
    const newStatus = new Map();
    const insideGeofences = [];

    for (const geofence of geofences) {
      const geoId = geofence._id.toString();
      let isInside = false;

      // Circle
      if (geofence.type === 'circle') {
        const distance = geoUtils.getDistance(
          position.lat,
          position.lon,
          geofence.center.lat,
          geofence.center.lon
        );
        isInside = distance <= geofence.radius;
      }

      // Polygon
      else if (geofence.type === 'polygon') {
        const point = [position.lat, position.lon];
        const polygon = geofence.coordinates.map(coord => [coord.lat, coord.lon]);
        isInside = geoUtils.pointInPolygon(point, polygon);
      }

      // Get previous state or defaults
      const previous = previousStatus.get(geoId) || {
        inside: false,
        entryAlertSent: false,
        exitAlertSent: false,
      };

      const status = {
        inside: isInside,
        entryAlertSent: previous.entryAlertSent,
        exitAlertSent: previous.exitAlertSent,
      };

      // Entry alert
      if (isInside && !previous.inside && geofence.notifyOnEntry && !previous.entryAlertSent) {
        await createAlert(vehicle, 'GEOFENCE_ENTRY', `${vehicle.name} entered "${geofence.name}"`, {
          geofenceId: geoId,
          geofenceName: geofence.name,
          lat: position.lat,
          lon: position.lon,
        });
        status.entryAlertSent = true;
        status.exitAlertSent = false; // reset exit flag
      }

      // Exit alert
      if (!isInside && previous.inside && geofence.notifyOnExit && !previous.exitAlertSent) {
        await createAlert(vehicle, 'GEOFENCE_EXIT', `${vehicle.name} exited "${geofence.name}"`, {
          geofenceId: geoId,
          geofenceName: geofence.name,
          lat: position.lat,
          lon: position.lon,
        });
        status.exitAlertSent = true;
        status.entryAlertSent = false; // reset entry flag
      }

      newStatus.set(geoId, status);

      if (isInside) {
        insideGeofences.push(geofence);
      }
    }

    if (updateVehicle) {
      vehicle.lastGeofenceStatus = newStatus;
      await vehicle.save();
    }

    return insideGeofences;
  } catch (error) {
    console.error('Error checking geofence status:', error);
    return [];
  }
};

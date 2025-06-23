const Geofence = require('../models/Geofence');
const Vehicle = require('../models/Vehicle');
const geoUtils = require('../utils/geoUtils');
const { createAlert } = require('./alertService');

exports.checkVehicleGeofenceStatus = async (vehicleId, position, updateVehicle = true) => {
  try {
    const vehicle = await Vehicle.findById(vehicleId).populate('user');
    if (!vehicle) throw new Error(`Vehicle not found with id ${vehicleId}`);

    const geofences = await Geofence.find({ vehicles: vehicleId, active: true });

    const previousStatus = vehicle.lastGeofenceStatus || {};
    const newStatus = {};
    const insideGeofences = [];

    for (const geofence of geofences) {
      let isInside = false;

      if (geofence.type === 'circle') {
        const distance = geoUtils.getDistance(
          position.lat,
          position.lon,
          geofence.center.lat,
          geofence.center.lon
        );
        isInside = distance <= geofence.radius;
      } else if (geofence.type === 'polygon') {
        const point = [position.lat, position.lon];
        const polygon = geofence.coordinates.map(coord => [coord.lat, coord.lon]);
        isInside = geoUtils.pointInPolygon(point, polygon);
      }

      const geoId = geofence._id.toString();
      newStatus[geoId] = isInside;

      if (isInside) {
        insideGeofences.push(geofence);
      }

      const wasInside = previousStatus[geoId];

      if (isInside && !wasInside && geofence.notifyOnEntry) {
        const msg = `${vehicle.name} entered geofence "${geofence.name}"`;
        await createAlert(vehicle, 'GEOFENCE_ENTRY', msg, {
          geofenceId: geoId,
          geofenceName: geofence.name,
          lat: position.lat,
          lon: position.lon
        });
      }

      if (!isInside && wasInside && geofence.notifyOnExit) {
        const msg = `${vehicle.name} exited geofence "${geofence.name}"`;
        await createAlert(vehicle, 'GEOFENCE_EXIT', msg, {
          geofenceId: geoId,
          geofenceName: geofence.name,
          lat: position.lat,
          lon: position.lon
        });
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

const Geofence = require('../models/Geofence');
const Vehicle = require('../models/Vehicle');
const geoUtils = require('../utils/geoUtils');
const notificationService = require('./notificationService');

/**
 * Check if a vehicle is inside any geofences and trigger notifications if needed
 * @param {String} vehicleId - Vehicle MongoDB ID
 * @param {Object} position - Vehicle position {lat, lon}
 * @param {Boolean} updateVehicle - Whether to update vehicle's lastGeofenceStatus
 * @returns {Array} List of geofences the vehicle is currently inside
 */
exports.checkVehicleGeofenceStatus = async (vehicleId, position, updateVehicle = true) => {
  try {
    // Get the vehicle with its previous geofence states
    const vehicle = await Vehicle.findById(vehicleId).populate('user');
    
    if (!vehicle) {
      throw new Error(`Vehicle not found with id ${vehicleId}`);
    }

    // Get all active geofences that contain this vehicle
    const geofences = await Geofence.find({
      vehicles: vehicleId,
      active: true
    });

    // Previous geofence status (map of geofence IDs that the vehicle was inside)
    const previousStatus = vehicle.lastGeofenceStatus || {};
    
    // New geofence status
    const newStatus = {};
    const insideGeofences = [];
    
    // Check each geofence
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
      
      newStatus[geofence._id.toString()] = isInside;
      
      if (isInside) {
        insideGeofences.push(geofence);
      }
      
      // Check for geofence entry event
      if (isInside && !previousStatus[geofence._id.toString()] && geofence.notifyOnEntry) {
        // Vehicle has entered the geofence
        await notificationService.createNotification({
          user: vehicle.user._id,
          type: 'geofence_entry',
          title: `${vehicle.name} entered geofence`,
          message: `Vehicle ${vehicle.name} has entered geofence "${geofence.name}"`,
          data: {
            vehicleId: vehicle._id,
            geofenceId: geofence._id,
            location: position
          }
        });
      }
      
      // Check for geofence exit event
      if (!isInside && previousStatus[geofence._id.toString()] && geofence.notifyOnExit) {
        // Vehicle has exited the geofence
        await notificationService.createNotification({
          user: vehicle.user._id,
          type: 'geofence_exit',
          title: `${vehicle.name} exited geofence`,
          message: `Vehicle ${vehicle.name} has exited geofence "${geofence.name}"`,
          data: {
            vehicleId: vehicle._id,
            geofenceId: geofence._id,
            location: position
          }
        });
      }
    }
    
    // Update the vehicle's geofence status if needed
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

/**
 * Create a new circular geofence
 * @param {Object} userData - User data including id
 * @param {String} name - Geofence name
 * @param {Object} center - Center coordinates {lat, lon}
 * @param {Number} radius - Radius in meters
 * @param {Array} vehicles - Array of vehicle IDs to assign
 * @returns {Object} Created geofence
 */
exports.createCircularGeofence = async (userData, name, center, radius, vehicles = []) => {
  const geofenceData = {
    name,
    type: 'circle',
    center,
    radius,
    vehicles,
    user: userData.id,
    description: `Circular geofence with radius of ${radius} meters`
  };
  
  return await Geofence.create(geofenceData);
};

/**
 * Create a new polygon geofence
 * @param {Object} userData - User data including id
 * @param {String} name - Geofence name
 * @param {Array} coordinates - Array of {lat, lon} objects forming the polygon
 * @param {Array} vehicles - Array of vehicle IDs to assign
 * @returns {Object} Created geofence
 */
exports.createPolygonGeofence = async (userData, name, coordinates, vehicles = []) => {
  if (!Array.isArray(coordinates) || coordinates.length < 3) {
    throw new Error('Polygon must have at least 3 points');
  }
  
  const geofenceData = {
    name,
    type: 'polygon',
    coordinates,
    vehicles,
    user: userData.id,
    description: `Polygon geofence with ${coordinates.length} points`
  };
  
  return await Geofence.create(geofenceData);
};
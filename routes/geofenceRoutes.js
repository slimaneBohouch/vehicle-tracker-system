const express = require('express');
const {
  createGeofence,
  getGeofences,
  getGeofence,
  updateGeofence,
  deleteGeofence,
  assignVehiclesToGeofence,
  checkVehicleGeofences
} = require('../controllers/geofenceController');

// Middleware
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Base routes
router.route('/')
  .get(getGeofences)
  .post(createGeofence);

router.route('/:id')
  .get(getGeofence)
  .put(updateGeofence)
  .delete(deleteGeofence);

// Assign vehicles to geofence
router.route('/:id/vehicles')
  .put(assignVehiclesToGeofence);

// Check if a vehicle is inside any geofences
router.route('/check/:vehicleId')
  .get(checkVehicleGeofences);

module.exports = router;
const express = require('express');
const {
  createGeofence,
  getGeofences,
  getGeofence,
  updateGeofence,
  deleteGeofence,
  assignVehiclesToGeofence,
  checkAllVehicleGeofences,
  getGeofenceByVehicleId
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

// Check if a vehicle is inside any geofences
router.route('/check-all')
  .get(checkAllVehicleGeofences);

router.route('/:id')
  .get(getGeofence)
  .put(updateGeofence)
  .delete(deleteGeofence);

// Assign vehicles to geofence
router.route('/:id/vehicles')
  .put(assignVehiclesToGeofence);


router.route('/vehicle/:vehicleId')
  .get(getGeofenceByVehicleId);

module.exports = router;
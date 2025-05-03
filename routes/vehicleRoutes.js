const express = require('express');
const vehicleController = require('../controllers/vehicleController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

router
  .route('/')
  .get(vehicleController.getUserVehicles)
  .post(vehicleController.addVehicle);

router
  .route('/:id')
  .get(vehicleController.getVehicle)
  .patch(vehicleController.updateVehicle)
  .delete(vehicleController.deleteVehicle);

module.exports = router;
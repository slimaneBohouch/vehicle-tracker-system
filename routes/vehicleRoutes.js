const express = require('express');
const vehicleController = require('../controllers/vehicleController');
const { protect , authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

router.get('/stats', vehicleController.getVehicleStats);
router
  .route('/')
  .get(vehicleController.getUserVehicles)
  .post(vehicleController.addVehicle);

router
  .route('/:id')
  .get(vehicleController.getVehicle)
  .patch(vehicleController.updateVehicle)
  .delete(vehicleController.deleteVehicle);

router.put("/:vehicleId/reassign",protect,authorize("admin", "superadmin"), vehicleController.reassignVehicle);

module.exports = router;
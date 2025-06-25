// routes/alertRoutes.js
const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/active',  alertController.getActiveAlerts);
router.get('/stats', alertController.stats);
router.get('/history', alertController.resolvedAlerts);
router.get('/latest', alertController.latestAlerts);
module.exports = router;

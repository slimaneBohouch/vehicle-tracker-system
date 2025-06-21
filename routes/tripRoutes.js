const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/filter', tripController.getTripsByDate);
router.get('/positions/byTrip/:tripId', tripController.getPositionsByTrip);

module.exports = router;
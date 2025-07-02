const express = require('express');
const {
  getFleetOverview,
  getVehicleStatistics,
  getFleetStatus,
  getTripAnalytics,
  getTopVehicles,
  getUserStatistics,
  getTotalDistanceThisMonth,
  getPlacesHeatmap
} = require('../controllers/statisticsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/statistics/overview
 * @desc    Get comprehensive fleet statistics overview
 * @access  Private
 * @params  ?period=thisMonth|lastMonth|thisWeek|lastWeek|today|yesterday|thisYear
 */
router.get('/overview', getFleetOverview);

/**
 * @route   GET /api/statistics/vehicles
 * @desc    Get statistics for all accessible vehicles or specific vehicle
 * @access  Private
 * @params  ?period=thisMonth|thisWeek|today&vehicleId=optional
 */
router.get('/vehicles', getVehicleStatistics);

/**
 * @route   GET /api/statistics/fleet-status
 * @desc    Get current fleet status (vehicle counts by status)
 * @access  Private
 */
router.get('/fleet-status', getFleetStatus);

/**
 * @route   GET /api/statistics/trip-analytics
 * @desc    Get trip analytics with time-based grouping
 * @access  Private
 * @params  ?period=thisMonth|thisWeek|thisYear&groupBy=day|hour|week|month
 */
router.get('/trip-analytics', getTripAnalytics);

/**
 * @route   GET /api/statistics/top-vehicles
 * @desc    Get top performing vehicles based on specified metric
 * @access  Private
 * @params  ?period=thisMonth|thisWeek&metric=distance|trips|duration|speed&limit=10
 */
router.get('/top-vehicles', getTopVehicles);

/**
 * @route   GET /api/statistics/users
 * @desc    Get user statistics (admin/superadmin only)
 * @access  Private (Admin/SuperAdmin)
 * @params  ?period=thisMonth
 */
router.get('/users', getUserStatistics);

router.get('/total-distance-this-month', getTotalDistanceThisMonth);

router.get('/places-heatmap', getPlacesHeatmap);


module.exports = router;
const Vehicle = require('../models/Vehicle');
const Trip = require('../models/Trip');
const Position = require('../models/Position');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const moment = require('moment');

/**
 * Helper function to get user's accessible vehicles based on role
 */
const getUserAccessibleVehicles = async (user) => {
  if (user.role === 'superadmin') {
    // SuperAdmin can see all vehicles
    return await Vehicle.find({});
  } else if (user.role === 'admin') {
    // Admin can see all vehicles (based on your current logic)
    return await Vehicle.find({});
  } else {
    // Regular users can only see their own vehicles
    return await Vehicle.find({ user: user._id });
  }
};

/**
 * Helper function to get base query filter based on user role
 */
const getBaseVehicleFilter = (user) => {
  if (user.role === 'superadmin' || user.role === 'admin') {
    return {}; // No filter - can see all vehicles
  } else {
    return { user: user._id }; // Only their own vehicles
  }
};

/**
 * Get comprehensive fleet statistics
 * GET /api/statistics/overview
 */
exports.getFleetOverview = catchAsync(async (req, res, next) => {
  const { period = 'thisMonth' } = req.query;
  const user = req.user;

let startDate, endDate;

switch (period) {
  case 'today':
    startDate = moment().startOf('day').toDate();
    endDate = moment().endOf('day').toDate();
    break;
  case 'thisWeek':
    startDate = moment().startOf('week').toDate();
    endDate = moment().endOf('week').toDate();
    break;
  case 'thisMonth':
    startDate = moment().startOf('month').toDate();
    endDate = moment().endOf('month').toDate();
    break;
  case 'thisYear':
  default:
    startDate = moment().startOf('year').toDate();
    endDate = moment().endOf('year').toDate();
    break;
}


  // Get accessible vehicles
  const accessibleVehicles = await getUserAccessibleVehicles(user);
  const vehicleIds = accessibleVehicles.map(v => v._id);

  if (vehicleIds.length === 0) {
    return res.status(200).json({
      status: 'success',
      data: {
        totalDistance: 0,
        totalTrips: 0,
        totalDrivingTime: 0,
        activeVehicles: 0,
        averageDistancePerDay: 0,
        averageSpeed: 0,
        tripsPerDay: 0,
        utilization: 0,
        daysOfOperation: 0
      }
    });
  }

  // Aggregate trip statistics
  const tripStats = await Trip.aggregate([
    {
      $match: {
        vehicle: { $in: vehicleIds },
        startTime: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalDistance: { $sum: '$summary.distance' },
        totalTrips: { $sum: 1 },
        totalDuration: { $sum: '$summary.duration' },
        maxSpeed: { $max: '$summary.maxSpeed' },
        avgSpeed: { $avg: '$summary.averageSpeed' },
        uniqueVehicles: { $addToSet: '$vehicle' }
      }
    }
  ]);

  const stats = tripStats[0] || {
    totalDistance: 0,
    totalTrips: 0,
    totalDuration: 0,
    maxSpeed: 0,
    avgSpeed: 0,
    uniqueVehicles: []
  };

  // Calculate additional metrics
  const totalDays = moment(endDate).diff(moment(startDate), 'days') + 1;
  const activeVehicles = stats.uniqueVehicles.length;
  const averageDistancePerDay = totalDays > 0 ? stats.totalDistance / totalDays : 0;
  const tripsPerDay = totalDays > 0 ? stats.totalTrips / totalDays : 0;
  const totalDrivingTimeHours = stats.totalDuration / 60; // Convert minutes to hours
  
  // Calculate utilization (percentage of vehicles that were active)
  const utilization = accessibleVehicles.length > 0 ? 
    (activeVehicles / accessibleVehicles.length) * 100 : 0;

  // Count actual days of operation (days when trips occurred)
  const daysOfOperation = await Trip.distinct('startTime', {
    vehicle: { $in: vehicleIds },
    startTime: { $gte: startDate, $lte: endDate },
    status: 'completed'
  }).then(dates => {
    const uniqueDays = new Set();
    dates.forEach(date => {
      uniqueDays.add(moment(date).format('YYYY-MM-DD'));
    });
    return uniqueDays.size;
  });

  res.status(200).json({
    status: 'success',
    data: {
      totalDistance: Math.round(stats.totalDistance * 100) / 100,
      totalTrips: stats.totalTrips,
      totalDrivingTime: Math.round(totalDrivingTimeHours * 100) / 100,
      activeVehicles,
      averageDistancePerDay: Math.round(averageDistancePerDay * 100) / 100,
      averageSpeed: Math.round(stats.avgSpeed * 100) / 100,
      tripsPerDay: Math.round(tripsPerDay * 100) / 100,
      utilization: Math.round(utilization),
      daysOfOperation,
      maxSpeed: Math.round(stats.maxSpeed * 100) / 100,
      period,
      dateRange: {
        startDate,
        endDate
      }
    }
  });
});

/**
 * Get vehicle-specific statistics
 * GET /api/statistics/vehicles
 */
exports.getVehicleStatistics = catchAsync(async (req, res, next) => {
  const { period = 'thisMonth', vehicleId } = req.query;
  const user = req.user;
  
  // Get date range
  let startDate, endDate;
  switch (period) {
    case 'today':
      startDate = moment().startOf('day').toDate();
      endDate = moment().endOf('day').toDate();
      break;
    case 'thisWeek':
      startDate = moment().startOf('week').toDate();
      endDate = moment().endOf('week').toDate();
      break;
    case 'thisMonth':
    default:
      startDate = moment().startOf('month').toDate();
      endDate = moment().endOf('month').toDate();
      break;
  }

  // Get accessible vehicles
  let vehicleFilter = getBaseVehicleFilter(user);
  if (vehicleId) {
    vehicleFilter._id = vehicleId;
  }

  const vehicles = await Vehicle.find(vehicleFilter).lean();
  const vehicleIds = vehicles.map(v => v._id);

  if (vehicleIds.length === 0) {
    return res.status(200).json({
      status: 'success',
      data: []
    });
  }

  // Get statistics for each vehicle
  const vehicleStats = await Trip.aggregate([
    {
      $match: {
        vehicle: { $in: vehicleIds },
        startTime: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$vehicle',
        totalDistance: { $sum: '$summary.distance' },
        totalTrips: { $sum: 1 },
        totalDuration: { $sum: '$summary.duration' },
        maxSpeed: { $max: '$summary.maxSpeed' },
        avgSpeed: { $avg: '$summary.averageSpeed' }
      }
    }
  ]);

  // Combine vehicle info with statistics
  const result = vehicles.map(vehicle => {
    const stats = vehicleStats.find(s => s._id.toString() === vehicle._id.toString()) || {
      totalDistance: 0,
      totalTrips: 0,
      totalDuration: 0,
      maxSpeed: 0,
      avgSpeed: 0
    };

    return {
      vehicleId: vehicle._id,
      vehicleName: vehicle.name,
      licensePlate: vehicle.licensePlate,
      model: vehicle.model,
      currentStatus: vehicle.currentStatus,
      totalDistance: Math.round(stats.totalDistance * 100) / 100,
      totalTrips: stats.totalTrips,
      totalDrivingTime: Math.round((stats.totalDuration / 60) * 100) / 100, // Convert to hours
      maxSpeed: Math.round(stats.maxSpeed * 100) / 100,
      averageSpeed: Math.round(stats.avgSpeed * 100) / 100,
      lastPosition: vehicle.lastPosition
    };
  });

  res.status(200).json({
    status: 'success',
    data: result
  });
});

/**
 * Get fleet status (current status of all vehicles)
 * GET /api/statistics/fleet-status
 */
exports.getFleetStatus = catchAsync(async (req, res, next) => {
  const user = req.user;
  const baseFilter = getBaseVehicleFilter(user);

  // Get vehicle counts by status
  const statusCounts = await Vehicle.aggregate([
    { $match: baseFilter },
    {
      $group: {
        _id: '$currentStatus',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get total vehicle count
  const totalVehicles = await Vehicle.countDocuments(baseFilter);

  // Count active vehicles (moving + stopped)
  const activeVehicles = await Vehicle.countDocuments({
    ...baseFilter,
    currentStatus: { $in: ['moving', 'stopped'] }
  });

  // Calculate days of operation this month
  const startOfMonth = moment().startOf('month').toDate();
  const endOfMonth = moment().endOf('month').toDate();
  
  let vehicleIds = [];
  if (user.role === 'superadmin' || user.role === 'admin') {
    const allVehicles = await Vehicle.find({}, '_id');
    vehicleIds = allVehicles.map(v => v._id);
  } else {
    const userVehicles = await Vehicle.find({ user: user._id }, '_id');
    vehicleIds = userVehicles.map(v => v._id);
  }

  const daysOfOperation = await Trip.distinct('startTime', {
    vehicle: { $in: vehicleIds },
    startTime: { $gte: startOfMonth, $lte: endOfMonth },
    status: 'completed'
  }).then(dates => {
    const uniqueDays = new Set();
    dates.forEach(date => {
      uniqueDays.add(moment(date).format('YYYY-MM-DD'));
    });
    return uniqueDays.size;
  });

  // Calculate utilization
  const utilization = totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0;

  // Format status counts
  const statusData = {
    moving: 0,
    stopped: 0,
    inactive: 0,
    immobilized: 0
  };

  statusCounts.forEach(item => {
    if (statusData.hasOwnProperty(item._id)) {
      statusData[item._id] = item.count;
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      totalVehicles,
      activeVehicles,
      utilization,
      daysOfOperation,
      statusBreakdown: statusData
    }
  });
});

/**
 * Get trip analytics with time-based grouping
 * GET /api/statistics/trip-analytics
 */
exports.getTripAnalytics = catchAsync(async (req, res, next) => {
  const { period = 'thisMonth', groupBy = 'day' } = req.query;
  const user = req.user;
  
  // Get date range
  let startDate, endDate;
  switch (period) {
    case 'today':
      startDate = moment().startOf('day').toDate();
      endDate = moment().endOf('day').toDate();
      break;
    case 'thisWeek':
      startDate = moment().startOf('week').toDate();
      endDate = moment().endOf('week').toDate();
      break;
    case 'thisMonth':
    default:
      startDate = moment().startOf('month').toDate();
      endDate = moment().endOf('month').toDate();
      break;
    case 'thisYear':
      startDate = moment().startOf('year').toDate();
      endDate = moment().endOf('year').toDate();
      break;
  }

  // Get accessible vehicles
  const accessibleVehicles = await getUserAccessibleVehicles(user);
  const vehicleIds = accessibleVehicles.map(v => v._id);

  if (vehicleIds.length === 0) {
    return res.status(200).json({
      status: 'success',
      data: []
    });
  }   

  // Define grouping format
  let groupFormat;
  switch (groupBy) {
    case 'hour':
      groupFormat = '%Y-%m-%d %H:00';
      break;
    case 'day':
    default:
      groupFormat = '%Y-%m-%d';
      break;
    case 'week':
      groupFormat = '%Y-%U';
      break;
    case 'month':
      groupFormat = '%Y-%m';
      break;
  }

  // Aggregate trip data by time period
  const analytics = await Trip.aggregate([
    {
      $match: {
        vehicle: { $in: vehicleIds },
        startTime: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: groupFormat,
            date: '$startTime',
            timezone: 'Africa/Casablanca'
          }
        },
        tripCount: { $sum: 1 },
        totalDistance: { $sum: '$summary.distance' },
        totalDuration: { $sum: '$summary.duration' },
        avgSpeed: { $avg: '$summary.averageSpeed' },
        maxSpeed: { $max: '$summary.maxSpeed' },
        uniqueVehicles: { $addToSet: '$vehicle' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  // Format the response
  const formattedData = analytics.map(item => ({
    period: item._id,
    tripCount: item.tripCount,
    totalDistance: Math.round(item.totalDistance * 100) / 100,
    totalDuration: Math.round((item.totalDuration / 60) * 100) / 100, // Convert to hours
    averageSpeed: Math.round(item.avgSpeed * 100) / 100,
    maxSpeed: Math.round(item.maxSpeed * 100) / 100,
    activeVehicles: item.uniqueVehicles.length
  }));

  res.status(200).json({
    status: 'success',
    data: formattedData
  });
});

/**
 * Get top performing vehicles
 * GET /api/statistics/top-vehicles
 */
exports.getTopVehicles = catchAsync(async (req, res, next) => {
  const { period = 'thisMonth', metric = 'distance', limit = 10 } = req.query;
  const user = req.user;
  
  // Get date range
  let startDate, endDate;
  switch (period) {
    case 'thisWeek':
      startDate = moment().startOf('week').toDate();
      endDate = moment().endOf('week').toDate();
      break;
    case 'thisMonth':
    default:
      startDate = moment().startOf('month').toDate();
      endDate = moment().endOf('month').toDate();
      break;
  }

  // Get accessible vehicles
  const accessibleVehicles = await getUserAccessibleVehicles(user);
  const vehicleIds = accessibleVehicles.map(v => v._id);

  if (vehicleIds.length === 0) {
    return res.status(200).json({
      status: 'success',
      data: []
    });
  }

  // Define sort criteria based on metric
  let sortField;
  switch (metric) {
    case 'distance':
      sortField = { totalDistance: -1 };
      break;
    case 'trips':
      sortField = { totalTrips: -1 };
      break;
    case 'duration':
      sortField = { totalDuration: -1 };
      break;
    case 'speed':
      sortField = { avgSpeed: -1 };
      break;
    default:
      sortField = { totalDistance: -1 };
  }

  // Get top vehicles
  const topVehicles = await Trip.aggregate([
    {
      $match: {
        vehicle: { $in: vehicleIds },
        startTime: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$vehicle',
        totalDistance: { $sum: '$summary.distance' },
        totalTrips: { $sum: 1 },
        totalDuration: { $sum: '$summary.duration' },
        avgSpeed: { $avg: '$summary.averageSpeed' },
        maxSpeed: { $max: '$summary.maxSpeed' }
      }
    },
    {
      $lookup: {
        from: 'vehicles',
        localField: '_id',
        foreignField: '_id',
        as: 'vehicle'
      }
    },
    {
      $unwind: '$vehicle'
    },
    {
      $sort: sortField
    },
    {
      $limit: parseInt(limit)
    },
    {
      $project: {
        vehicleId: '$_id',
        vehicleName: '$vehicle.name',
        licensePlate: '$vehicle.licensePlate',
        model: '$vehicle.model',
        totalDistance: { $round: ['$totalDistance', 2] },
        totalTrips: 1,
        totalDuration: { $round: [{ $divide: ['$totalDuration', 60] }, 2] }, // Convert to hours
        averageSpeed: { $round: ['$avgSpeed', 2] },
        maxSpeed: { $round: ['$maxSpeed', 2] }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: topVehicles
  });
});

/**
 * Get user statistics (for admin/superadmin)
 * GET /api/statistics/users
 */
exports.getUserStatistics = catchAsync(async (req, res, next) => {
  const user = req.user;
  
  // Only admins and superadmins can access this
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return next(new AppError('You do not have permission to access user statistics', 403));
  }

  const { period = 'thisMonth' } = req.query;
  
  // Get date range
  let startDate, endDate;
  switch (period) {
    case 'thisMonth':
    default:
      startDate = moment().startOf('month').toDate();
      endDate = moment().endOf('month').toDate();
      break;
  }

  // Get user statistics
  const userStats = await User.aggregate([
    {
      $lookup: {
        from: 'vehicles',
        localField: '_id',
        foreignField: 'user',
        as: 'vehicles'
      }
    },
    {
      $lookup: {
        from: 'trips',
        let: { userId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$user', '$$userId'] },
              startTime: { $gte: startDate, $lte: endDate },
              status: 'completed'
            }
          },
          {
            $group: {
              _id: null,
              totalTrips: { $sum: 1 },
              totalDistance: { $sum: '$summary.distance' },
              totalDuration: { $sum: '$summary.duration' }
            }
          }
        ],
        as: 'tripStats'
      }
    },
    {
      $project: {
        name: 1,
        email: 1,
        role: 1,
        status: 1,
        company: 1,
        totalVehicles: { $size: '$vehicles' },
        activeVehicles: {
          $size: {
            $filter: {
              input: '$vehicles',
              cond: { $in: ['$$this.currentStatus', ['moving', 'stopped']] }
            }
          }
        },
        totalTrips: { $ifNull: [{ $arrayElemAt: ['$tripStats.totalTrips', 0] }, 0] },
        totalDistance: { $ifNull: [{ $arrayElemAt: ['$tripStats.totalDistance', 0] }, 0] },
        totalDuration: { $ifNull: [{ $arrayElemAt: ['$tripStats.totalDuration', 0] }, 0] }
      }
    },
    {
      $sort: { totalDistance: -1 }
    }
  ]);

  // Format the response
  const formattedStats = userStats.map(stat => ({
    userId: stat._id,
    name: stat.name,
    email: stat.email,
    role: stat.role,
    status: stat.status,
    company: stat.company,
    totalVehicles: stat.totalVehicles,
    activeVehicles: stat.activeVehicles,
    totalTrips: stat.totalTrips,
    totalDistance: Math.round(stat.totalDistance * 100) / 100,
    totalDuration: Math.round((stat.totalDuration / 60) * 100) / 100 // Convert to hours
  }));

  res.status(200).json({
    status: 'success',
    data: formattedStats
  });
});


//---------------
exports.getTotalDistanceThisMonth = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user._id;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    let vehicleFilter = {};

    if (userRole === "user") {
      const userVehicles = await Vehicle.find({ user: userId }).select("_id");
      const vehicleIds = userVehicles.map(v => v._id);
      vehicleFilter = { vehicle: { $in: vehicleIds } };
    }

    const total = await Trip.aggregate([
      {
        $match: {
          startTime: { $gte: startOfMonth, $lte: endOfMonth },
          status: "completed",
          ...vehicleFilter
        }
      },
      {
        $group: {
          _id: null,
          totalDistance: { $sum: "$summary.distance" }
        }
      }
    ]);

    res.json({
      totalDistance: total[0]?.totalDistance || 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
};

/**
 * Get Heatmap Data (places with most trip starts/ends)
 * GET /api/statistics/places-heatmap
 */
exports.getPlacesHeatmap = catchAsync(async (req, res, next) => {
  const { period = 'thisMonth' } = req.query;
  const user = req.user;

  // Get date range
  let startDate, endDate;
  switch (period) {
    case 'today':
      startDate = moment().startOf('day').toDate();
      endDate = moment().endOf('day').toDate();
      break;
    case 'thisWeek':
      startDate = moment().startOf('week').toDate();
      endDate = moment().endOf('week').toDate();
      break;
    case 'thisMonth':
      startDate = moment().startOf('month').toDate();
      endDate = moment().endOf('month').toDate();
      break;
    case 'thisYear':
      startDate = moment().startOf('year').toDate();
      endDate = moment().endOf('year').toDate();
      break;
    default:
      startDate = moment().startOf('month').toDate();
      endDate = moment().endOf('month').toDate();
  }

  // Filter vehicles based on role
  const accessibleVehicles = await getUserAccessibleVehicles(user);
  const vehicleIds = accessibleVehicles.map(v => v._id);

  if (vehicleIds.length === 0) {
    return res.status(200).json({
      status: 'success',
      data: []
    });
  }

  // Aggregate trips and count unique location points (start and end locations)
  const heatmapData = await Trip.aggregate([
    {
      $match: {
        vehicle: { $in: vehicleIds },
        startTime: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $project: {
        locations: [
          {
            type: '$startLocation.type',
            coordinates: '$startLocation.coordinates'
          },
          {
            type: '$endLocation.type',
            coordinates: '$endLocation.coordinates'
          }
        ]
      }
    },
    { $unwind: '$locations' },
    { $match: { 'locations.coordinates': { $ne: null } } },
    {
      $group: {
        _id: {
          lat: { $round: [{ $arrayElemAt: ['$locations.coordinates', 1] }, 4] },
          lon: { $round: [{ $arrayElemAt: ['$locations.coordinates', 0] }, 4] }
        },
        visitCount: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        lat: '$_id.lat',
        lon: '$_id.lon',
        visitCount: 1
      }
    },
    { $sort: { visitCount: -1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: heatmapData
  });
});

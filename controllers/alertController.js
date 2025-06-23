const Alert = require('../models/Alert');

exports.getActiveAlerts = async (req, res) => {
  try {
    const user = req.user;

    const filter = {
      resolved: false,
    };

    // 🔐 Filter by user's vehicles if not admin
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      filter['vehicleId'] = { $in: user.vehicles || [] };
    }

    const alerts = await Alert.find(filter)
      .sort({ timestamp: -1 })
      .populate('vehicleId', 'name licensePlate');

    const response = alerts.map(alert => ({
      _id: alert._id,
      vehicleId: alert.vehicleId._id,
      vehicleName: alert.vehicleId.name,
      vehicleLicensePlate: alert.vehicleId.licensePlate,
      type: alert.type,
      message: alert.message,
      timestamp: alert.timestamp,
      location: alert.location,
      data: alert.data,
      resolved: alert.resolved,
    }));

    res.json(response);
  } catch (err) {
    console.error('[Alert Fetch Error]', err.message);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

exports.stats = async (req, res) => {
  try {
    const user = req.user;
    const filter = {};

    // Restrict to user's vehicles if not admin/superadmin
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      filter['vehicleId'] = { $in: user.vehicles || [] };
    }

    // Count of active alerts (resolved = false)
    const activeCount = await Alert.countDocuments({ ...filter, resolved: false });

    // Count of each type (for active alerts)
    const typeCountsAgg = await Alert.aggregate([
      { $match: { ...filter, resolved: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    const typeCounts = {};
    typeCountsAgg.forEach(tc => { typeCounts[tc._id] = tc.count; });

    res.json({
      activeCount,
      typeCounts
    });
  } catch (err) {
    console.error('[Alert Stats Error]', err.message);
    res.status(500).json({ error: 'Failed to fetch alert stats' });
  }
};


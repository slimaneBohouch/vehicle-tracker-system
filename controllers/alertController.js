const Alert = require('../models/Alert');
const Vehicle = require('../models/Vehicle');

// 🔐 Helper to get vehicle IDs of current user
const getAccessibleVehicleIds = async (user) => {
  if (user.role === 'admin' || user.role === 'superadmin') return null;

  const vehicles = await Vehicle.find({ user: user._id }, '_id');
  return vehicles.map(v => v._id);
};

// ✅ GET /api/alerts/active
exports.getActiveAlerts = async (req, res) => {
  try {
    const user = req.user;
    const filter = { resolved: false };

    const vehicleIds = await getAccessibleVehicleIds(user);
    if (vehicleIds) filter['vehicleId'] = { $in: vehicleIds };

    const alerts = await Alert.find(filter)
      .sort({ timestamp: -1 })
      .populate('vehicleId', 'name licensePlate');

    res.json(alerts.map(a => ({
      _id: a._id,
      vehicleId: a.vehicleId._id,
      vehicleName: a.vehicleId.name,
      vehicleLicensePlate: a.vehicleId.licensePlate,
      type: a.type,
      message: a.message,
      timestamp: a.timestamp,
      location: a.location,
      data: a.data,
      resolved: a.resolved
    })));
  } catch (err) {
    console.error('[Alert Fetch Error]', err.message);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

// ✅ GET /api/alerts/resolved
exports.resolvedAlerts = async (req, res) => {
  try {
    const user = req.user;
    const filter = { resolved: true };

    const vehicleIds = await getAccessibleVehicleIds(user);
    if (vehicleIds) filter['vehicleId'] = { $in: vehicleIds };

    const alerts = await Alert.find(filter)
      .sort({ timestamp: -1 })
      .populate('vehicleId', 'name licensePlate');

    res.json(alerts.map(a => ({
      _id: a._id,
      vehicleId: a.vehicleId._id,
      vehicleName: a.vehicleId.name,
      vehicleLicensePlate: a.vehicleId.licensePlate,
      type: a.type,
      message: a.message,
      timestamp: a.timestamp,
      location: a.location,
      data: a.data,
      resolved: a.resolved
    })));
  } catch (err) {
    console.error('[Alert Resolved Error]', err.message);
    res.status(500).json({ error: 'Failed to fetch resolved alerts' });
  }
};

// ✅ GET /api/alerts/latest
exports.latestAlerts = async (req, res) => {
  try {
    const user = req.user;
    const filter = {};

    const vehicleIds = await getAccessibleVehicleIds(user);
    if (vehicleIds) filter['vehicleId'] = { $in: vehicleIds };

    const alerts = await Alert.find(filter)
      .sort({ timestamp: -1 })
      .limit(4)
      .populate('vehicleId', 'name licensePlate');

    res.json(alerts.map(a => ({
      _id: a._id,
      vehicleId: a.vehicleId._id,
      vehicleName: a.vehicleId.name,
      vehicleLicensePlate: a.vehicleId.licensePlate,
      type: a.type,
      message: a.message,
      timestamp: a.timestamp,
      location: a.location,
      data: a.data,
    })));
  } catch (err) {
    console.error('[Alert Latest Error]', err.message);
    res.status(500).json({ error: 'Failed to fetch latest alerts' });
  }
};

// ✅ GET /api/alerts/stats
exports.stats = async (req, res) => {
  try {
    const user = req.user;
    const baseFilter = {};

    const vehicleIds = await getAccessibleVehicleIds(user);
    if (vehicleIds) baseFilter['vehicleId'] = { $in: vehicleIds };

    // Count of active alerts
    const activeCount = await Alert.countDocuments({ ...baseFilter, resolved: false });

    // Count by type
    const typeCountsAgg = await Alert.aggregate([
      { $match: { ...baseFilter, resolved: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const typeCounts = {};
    typeCountsAgg.forEach(({ _id, count }) => {
      typeCounts[_id] = count;
    });

    res.json({ activeCount, typeCounts });
  } catch (err) {
    console.error('[Alert Stats Error]', err.message);
    res.status(500).json({ error: 'Failed to fetch alert stats' });
  }
};

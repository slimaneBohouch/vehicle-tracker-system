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

// cron/inactiveVehiclesJob.js
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle'); // adjust path as needed

async function markInactiveVehicles() {
  try {
    const now = new Date();
    const threshold = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes ago

    // Find all vehicles that haven't been updated in the last 15 min AND are not already inactive
    const staleVehicles = await Vehicle.find({
      'lastLocation.timestamp': { $lt: threshold },
      currentStatus: { $ne: 'inactive' }
    });

    for (const vehicle of staleVehicles) {
      vehicle.currentStatus = 'inactive';
      await vehicle.save();

      console.log(`[CRON] Marked ${vehicle.name} (${vehicle.imei}) as inactive`);
    }
  } catch (error) {
    console.error('[CRON ERROR] Failed to mark vehicles as inactive:', error.message);
  }
}

module.exports = markInactiveVehicles;
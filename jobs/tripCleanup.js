const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const Position = require("../models/Position");

module.exports = async function closeInactiveTrips() {
  const now = new Date();
  const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);

  const inactiveTrips = await Trip.find({
    status: "active",
    updatedAt: { $lt: fiveMinutesAgo }
  });

  for (const trip of inactiveTrips) {
    const lastPosition = await Position.findOne({ trip: trip._id }).sort({ createdAt: -1 });

    if (lastPosition) {
      const lastCoord = lastPosition.location.coordinates;
      const distance = 0; // No distance since last update

      trip.summary.distance += distance;
      trip.endTime = lastPosition.createdAt;
      trip.endLocation = {
        type: "Point",
        coordinates: lastCoord,
        timestamp: lastPosition.createdAt,
        speed: lastPosition.speed
      };

      const durationMs = trip.endTime - trip.startTime;
      const durationMin = durationMs / 60000;
      trip.summary.duration = durationMin;
      trip.summary.averageSpeed =
        durationMin > 0 ? (trip.summary.distance / (durationMin / 60)) : 0;
    }

    trip.status = "completed";
    await trip.save();

    console.log(`[CRON] Closed inactive trip ${trip._id}`);
  }
};

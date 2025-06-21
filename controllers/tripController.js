const Trip = require('../models/Trip');
const Position = require('../models/Position');

const POSITION_INTERVAL = 60 * 1000; // 1 minute

// 🔁 Haversine formula to calculate distance in km
function haversineDistance(coord1, coord2) {
  const R = 6371; // Earth radius in km
  const toRad = deg => deg * Math.PI / 180;

  const dLat = toRad(coord2[1] - coord1[1]); // lat2 - lat1
  const dLon = toRad(coord2[0] - coord1[0]); // lon2 - lon1
  const lat1 = toRad(coord1[1]);
  const lat2 = toRad(coord2[1]);

  const a = Math.sin(dLat / 2) ** 2 +
            Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

exports.handleTripTracking = async (vehicle, data) => {
  const { lat, lon, speedGps, ignition, gpsTimestamp, extendedData } = data;
  const timestamp = gpsTimestamp ? new Date(gpsTimestamp) : new Date();
  const isMoving = ignition && speedGps >= 0;

  let trip = await Trip.findOne({ vehicle: vehicle._id, status: 'active' });

  // 🛑 If vehicle stopped, end the trip
  if (!isMoving) {
    if (trip) {
      trip.status = 'completed';
      trip.endTime = timestamp;
      trip.endLocation = {
        type: 'Point',
        coordinates: [lon, lat],
        timestamp,
        speed: speedGps
      };

      const durationMs = trip.endTime - trip.startTime;
      trip.summary.duration = Math.round(durationMs / 60000); // in minutes

      // ✅ averageSpeed = total distance / duration in hours
      trip.summary.averageSpeed = trip.summary.duration > 0
        ? (trip.summary.distance / (trip.summary.duration / 60))
        : 0;

      await trip.save();
    }
    return;
  }

  // 🆕 If no active trip, create one
  if (!trip) {
    trip = await Trip.create({
      vehicle: vehicle._id,
      user: vehicle.user,
      startTime: timestamp,
      startLocation: {
        type: 'Point',
        coordinates: [lon, lat],
        timestamp,
        speed: speedGps
      },
      summary: {
        distance: 0,
        duration: 0,
        averageSpeed: 0,
        maxSpeed: speedGps,
        positionsCount: 0
      },
      status: 'active'
    });
  }

  // ⏱ Prevent duplicate saves too close in time
  const lastPosition = await Position.findOne({ trip: trip._id }).sort({ createdAt: -1 });
  if (lastPosition && timestamp - lastPosition.createdAt < POSITION_INTERVAL) return;

  // 📍 Create new position
  await Position.create({
    vehicle: vehicle._id,
    trip: trip._id,
    location: {
      type: 'Point',
      coordinates: [lon, lat]
    },
    speed: speedGps,
    deviceStatus: {
      ignition,
      battery: extendedData?.vehicleBattery || null
    },
    createdAt: timestamp
  });

  // 📈 Update trip summary
  trip.summary.positionsCount += 1;

  if (speedGps > trip.summary.maxSpeed) {
    trip.summary.maxSpeed = speedGps;
  }

  if (lastPosition) {
    const lastCoord = lastPosition.location.coordinates; // [lon, lat]
    const currentCoord = [lon, lat];
    const distance = haversineDistance(currentCoord, lastCoord);
    trip.summary.distance += distance;
  }

  trip.updatedAt = new Date();
  await trip.save();
};


exports.getTripsByDate = async (req, res) => {
  const { vehicleId, startDate, endDate } = req.query;
  const filter = {
    startTime: { $gte: new Date(startDate), $lte: new Date(endDate) }
  };
  if (vehicleId) filter.vehicle = vehicleId;

  const trips = await Trip.find(filter).populate('vehicle').lean();
  res.status(200).json(trips);
};

exports.getPositionsByTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const positions = await Position.find({ trip: tripId })
      .sort({ createdAt: 1 })
      .select('location createdAt speed');

    res.status(200).json(positions);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch positions' });
  }
};

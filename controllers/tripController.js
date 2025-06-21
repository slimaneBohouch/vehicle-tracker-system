const Trip = require('../models/Trip');
const Position = require('../models/Position');

const POSITION_INTERVAL = 30 * 1000; // 30 sec

function haversineDistance(coord1, coord2) {
  const R = 6371; // Earth radius in km
  const toRad = deg => deg * Math.PI / 180;

  const dLat = toRad(coord2[1] - coord1[1]);
  const dLon = toRad(coord2[0] - coord1[0]);
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

  const isIgnitionOn = ignition === true || extendedData?.DIN1 === 1;
  const isIgnitionOff = ignition === false || extendedData?.DIN1 === 0;
  const isMoving = isIgnitionOn && speedGps > 0;

  let trip = await Trip.findOne({ vehicle: vehicle._id, status: 'active' });

  // 🛑 End the trip if ignition is off
  if (isIgnitionOff && trip) {
    const lastPosition = await Position.findOne({ trip: trip._id }).sort({ createdAt: -1 });

    if (lastPosition) {
      const lastCoord = lastPosition.location.coordinates;
      const currentCoord = [lon, lat];
      const distance = haversineDistance(currentCoord, lastCoord);
      trip.summary.distance += distance;
    }

    trip.status = 'completed';
    trip.endTime = timestamp;
    trip.endLocation = {
      type: 'Point',
      coordinates: [lon, lat],
      timestamp,
      speed: speedGps
    };

    const durationMs = trip.endTime - trip.startTime;
    const durationMin = durationMs / 60000;
    trip.summary.duration = durationMin;
    trip.summary.averageSpeed = durationMin > 0 ? (trip.summary.distance / (durationMin / 60)) : 0;

    await trip.save();

    console.log(`[Trip Ended] ${vehicle.name} | Distance: ${trip.summary.distance.toFixed(2)} km | Duration: ${durationMin.toFixed(1)} min`);
    return;
  }

  // 🆕 Start a new trip if ignition on + moving
  if (!trip && isMoving) {
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
    console.log(`[Trip Started] ${vehicle.name} at ${timestamp.toISOString()}`);
  }

  // ⏱ Avoid saving too frequently
  if (trip) {
  const lastPosition = await Position.findOne({ trip: trip._id }).sort({ createdAt: -1 });

  if (lastPosition && timestamp - lastPosition.createdAt < POSITION_INTERVAL) return;

  // ✅ Enregistrer la nouvelle position
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
      battery: extendedData?.vehicleBattery || 0
    },
    createdAt: timestamp
  });

  // ✅ Mettre à jour le résumé du trip
  trip.summary.positionsCount += 1;

  // ✅ Calcul correct de la vitesse max
  const currentValidSpeed = speedGps && speedGps > 0 ? speedGps : 0;
  if (currentValidSpeed > trip.summary.maxSpeed) {
    trip.summary.maxSpeed = currentValidSpeed;
  }

  if (lastPosition) {
    const lastCoord = lastPosition.location.coordinates;
    const currentCoord = [lon, lat];
    const distance = haversineDistance(currentCoord, lastCoord);
    trip.summary.distance += distance;
  }

  trip.updatedAt = new Date();
  await trip.save();
}

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
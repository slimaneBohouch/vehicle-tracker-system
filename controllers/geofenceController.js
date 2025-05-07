  const Geofence = require('../models/Geofence');
  const Vehicle = require('../models/Vehicle');
  const geoUtils = require('../utils/geoUtils');
  const asyncHandler = require('../middleware/async');
  const ErrorResponse = require('../Utils/errorResponse');
  const axios = require('axios');

  /**
   * @desc    Create a new geofence
   * @route   POST /api/geofences
   * @access  Private
   */
  exports.createGeofence = asyncHandler(async (req, res, next) => {
    // Add user to request body
    req.body.user = req.user.id;
    
    // Validate geofence data
    if (req.body.type === 'circle') {
      if (!req.body.center || !req.body.radius) {
        return next(
          new ErrorResponse('Circular geofences require center and radius', 400)
        );
      }
    } else if (req.body.type === 'polygon') {
      if (!req.body.coordinates || req.body.coordinates.length < 3) {
        return next(
          new ErrorResponse('Polygon geofences require at least 3 coordinates', 400)
        );
      }
    } else {
      return next(
        new ErrorResponse('Geofence type must be either circle or polygon', 400)
      );
    }

    const geofence = await Geofence.create(req.body);

    res.status(201).json({
      success: true,
      data: geofence
    });
  });

  /**
   * @desc    Get all geofences for current user
   * @route   GET /api/geofences
   * @access  Private
   */
  exports.getGeofences = asyncHandler(async (req, res, next) => {
    const geofences = await Geofence.find({ user: req.user.id });

    res.status(200).json({
      success: true,
      count: geofences.length,
      data: geofences
    });
  });

  /**
   * @desc    Get single geofence
   * @route   GET /api/geofences/:id
   * @access  Private
   */
  exports.getGeofence = asyncHandler(async (req, res, next) => {
    const geofence = await Geofence.findById(req.params.id).populate('vehicles');

    if (!geofence) {
      return next(
        new ErrorResponse(`Geofence not found with id of ${req.params.id}, 404`)
      );
    }

    // Make sure user owns the geofence
    if (geofence.user.toString() !== req.user.id) {
      return next(
        new ErrorResponse(`User not authorized to access this geofence`, 401)
      );
    }

    res.status(200).json({
      success: true,
      data: geofence
    });
  });

  /**
   * @desc    Update geofence
   * @route   PUT /api/geofences/:id
   * @access  Private
   */
  exports.updateGeofence = asyncHandler(async (req, res, next) => {
    let geofence = await Geofence.findById(req.params.id);

    if (!geofence) {
      return next(
        new ErrorResponse(`Geofence not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user owns the geofence
    if (geofence.user.toString() !== req.user.id) {
      return next(
        new ErrorResponse(`User not authorized to update this geofence`, 401)
      );
    }

    // Validate geofence data if type is being updated
    if (req.body.type) {
      if (req.body.type === 'circle') {
        if (!req.body.center || !req.body.radius) {
          return next(
            new ErrorResponse('Circular geofences require center and radius', 400)
          );
        }
      } else if (req.body.type === 'polygon') {
        if (!req.body.coordinates || req.body.coordinates.length < 3) {
          return next(
            new ErrorResponse('Polygon geofences require at least 3 coordinates', 400)
          );
        }
      } else {
        return next(
          new ErrorResponse('Geofence type must be either circle or polygon', 400)
        );
      }
    }

    geofence = await Geofence.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: geofence
    });
  });

  /**
   * @desc    Delete geofence
   * @route   DELETE /api/geofences/:id
   * @access  Private
   */
  exports.deleteGeofence = asyncHandler(async (req, res, next) => {
    const geofence = await Geofence.findById(req.params.id);

    if (!geofence) {
      return next(
        new ErrorResponse(`Geofence not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user owns the geofence
    if (geofence.user.toString() !== req.user.id) {
      return next(
        new ErrorResponse(`User not authorized to delete this geofence`, 401)
      );
    }


    await Geofence.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      data: {}
    });
  });

  /**
   * @desc    Assign vehicles to geofence
   * @route   PUT /api/geofences/:id/vehicles
   * @access  Private
   */
  exports.assignVehiclesToGeofence = asyncHandler(async (req, res, next) => {
    const { vehicles } = req.body;
    
    if (!vehicles || !Array.isArray(vehicles)) {
      return next(
        new ErrorResponse('Please provide an array of vehicle IDs', 400)
      );
    }

    const geofence = await Geofence.findById(req.params.id);

    if (!geofence) {
      return next(
        new ErrorResponse(`Geofence not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user owns the geofence
    if (geofence.user.toString() !== req.user.id) {
      return next(
        new ErrorResponse(`User not authorized to update this geofence`, 401)
      );
    }

    // Verify all vehicles exist and belong to user
    for (const vehicleId of vehicles) {
      const vehicle = await Vehicle.findById(vehicleId);
      
      if (!vehicle) {
        return next(
          new ErrorResponse(`Vehicle not found with id of ${vehicleId}`, 404)
        );
      }
      
      if (vehicle.user.toString() !== req.user.id) {
        return next(
          new ErrorResponse(`User not authorized to assign vehicle ${vehicleId}`, 401)
        );
      }
    }

    // Update geofence with vehicles
    geofence.vehicles = vehicles;
    await geofence.save();

    res.status(200).json({
      success: true,
      data: geofence
    });
  });

/**
 * @desc    Check all of the user’s vehicles against all active geofences
 * @route   GET /api/geofences/check
 * @access  Private
 */
exports.checkAllVehicleGeofences = asyncHandler(async (req, res, next) => {
  // 1) load vehicles
  const vehicles = await Vehicle.find({ user: req.user.id });

  // 2) fetch external devices
let externalDevices = [];
  try {
    const externalResponse = await axios.get('http://www.pogog.ovh:5051/devices');
    externalDevices = Array.isArray(externalResponse.data) ? externalResponse.data : [];
  } catch (error) {
    console.error("Failed to fetch external devices:", error.message);
    // Proceed with internal data only
  }
  // 3) enrich with numeric lat/lon—try extendedData first, then fall back to DB fields
  const enriched = vehicles.map(v => {
    const dev = externalDevices.find(d =>
      d.IMEI?.toString().trim() === v.imei?.toString().trim()
    );
  
    const rawLat = dev?.lat ?? dev?.extendedData?.lat ?? v.lat ?? v.location?.coordinates[1] ?? null;
    const rawLon = dev?.lon ?? dev?.extendedData?.lon ?? v.lon ?? v.location?.coordinates[0] ?? null;
  
    const lat = rawLat != null ? parseFloat(rawLat) : null;
    const lon = rawLon != null ? parseFloat(rawLon) : null;
  
    return {
      vehicleId: v._id.toString(),
      vehicleName: v.name,
      lat,
      lon
    };
  });
  
  // 4) load active geofences
  const geofences = await Geofence.find({ user: req.user.id, active: true });

  // 5) perform checks
  const results = enriched.map(({ vehicleId, vehicleName, lat, lon }) => {

    const inside = geofences.filter(g => {
      if (g.type === 'circle') {
        const dist = geoUtils.getDistance(lat, lon, g.center.lat, g.center.lon);
       
        return dist <= g.radius;
      }
    }).map(g => ({ id: g._id.toString(), name: g.name, type: g.type }));

    return { vehicleId, vehicleName, inside };
  });

  res.status(200).json({ success: true, count: results.length, data: results });
});
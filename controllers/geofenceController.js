  const Geofence = require('../models/Geofence');
  const Vehicle = require('../models/Vehicle');
  const geoUtils = require('../utils/geoUtils');
  const asyncHandler = require('../middleware/async');
  const ErrorResponse = require('../Utils/errorResponse');

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
   * @desc    Check if a vehicle is inside any geofences
   * @route   GET /api/geofences/check/:vehicleId
   * @access  Private
   */
  exports.checkVehicleGeofences = asyncHandler(async (req, res, next) => {
    const { vehicleId } = req.params;
    
    // Get the vehicle
    const vehicle = await Vehicle.findById(vehicleId);
    
    if (!vehicle) {
      return next(
        new ErrorResponse(`Vehicle not found with id of ${vehicleId}`, 404)
      );
    }
    
    // Make sure user owns the vehicle
    if (vehicle.user.toString() !== req.user.id) {
      return next(
        new ErrorResponse(`User not authorized to access this vehicle`, 401)
      );
    }
    
    // Get all geofences for this user
    const geofences = await Geofence.find({ 
      user: req.user.id,
      active: true
    });
    
    // Check which geofences the vehicle is currently in
    const vehicleLocation = {
      lat: vehicle.lat,
      lon: vehicle.lon
    };
      
    const insideGeofences = [];
    
    for (const geofence of geofences) {
      let isInside = false;
      
      if (geofence.type === 'circle') {
        const distance = geoUtils.getDistance(
          vehicleLocation.lat,
          vehicleLocation.lon,
          geofence.center.lat,
          geofence.center.lon
        );
        isInside = distance <= geofence.radius;
      } else if (geofence.type === 'polygon') {
        const point = [vehicleLocation.lat, vehicleLocation.lon];
        const polygon = geofence.coordinates.map(coord => [coord.lat, coord.lon]);
        isInside = geoUtils.pointInPolygon(point, polygon);
      }
      
      if (isInside) {
        insideGeofences.push(geofence);
      }
    }
    
    res.status(200).json({
      success: true,
      count: insideGeofences.length,
      data: insideGeofences
    });
  });
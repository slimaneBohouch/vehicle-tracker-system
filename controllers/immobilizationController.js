// controllers/immobilizationController.js
const Immobilization = require('../models/Immobilization');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const Vehicle = require('../models/Vehicle');

// Créer une nouvelle immobilisation
exports.createImmobilization = catchAsync(async (req, res, next) => {
  const vehicleId = req.body.vehicle;

  // Check if there is already an active immobilization for this vehicle
  const existing = await Immobilization.findOne({ vehicle: vehicleId, status: 'active' });
  if (existing) {
    return next(new AppError('Vehicle already immobilized', 400));
  }

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    return next(new AppError('Vehicle not found', 404));
  }

  const data = {
    vehicle: vehicleId,
    user: req.user.id,
    action: req.body.action,
    reason: req.body.reason,
    location: req.body.location,
    status: 'active'
  };

  vehicle.currentStatus = 'immobilized';
  await vehicle.save();
  const record = await Immobilization.create(data);

  res.status(201).json({
    status: 'success',
    data: {
      immobilization: record,
    },
  });
});

// Obtenir toutes les immobilisations
exports.getAllImmobilizations = catchAsync(async (req, res, next) => {
    const status = req.query.status;
    if(status === 'active') {
      // Filtrer pour les immobilisations actives
      const records = await Immobilization.find({ status: 'active' })
        .populate('vehicle', 'name licensePlate')
        .populate('user', 'name email')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        status: 'success',
        results: records.length,
        data: {
          immobilizations: records,
        },
      });
    }else if(status === 'inactive') {
      // Filtrer pour les immobilisations inactives
      const records = await Immobilization.find({ status: 'inactive' })
        .populate('vehicle', 'name licensePlate')
        .populate('user', 'name email')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        status: 'success',
        results: records.length,
        data: {
          immobilizations: records,
        },
      });
    }
  const records = await Immobilization.find()
    .populate('vehicle', 'name licensePlate')
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: records.length,
    data: {
      immobilizations: records,
    },
  });
});

// Obtenir une immobilisation par ID
exports.getImmobilization = catchAsync(async (req, res, next) => {
  const record = await Immobilization.findById(req.params.id)
    .populate('vehicle', 'name licensePlate')
    .populate('user', 'name email');

  if (!record) return next(new AppError('Immobilization not found', 404));

  res.status(200).json({
    status: 'success',
    data: { immobilization: record },
  });
});

exports.mobilizeImmobilization = catchAsync(async (req, res, next) => {
  const record = await Immobilization.findById(req.params.id);

  if (!record) return next(new AppError('Immobilization not found', 404));

  record.status = 'inactive';
  await record.save();
  const vehicle = await Vehicle.findById(record.vehicle);
  if (vehicle) {
    vehicle.currentStatus = 'inactive';
    await vehicle.save();
  }

  res.status(200).json({
    status: 'success',
    data: { immobilization: record },
  });
});

// Supprimer une immobilisation
exports.deleteImmobilization = catchAsync(async (req, res, next) => {
  const record = await Immobilization.findByIdAndDelete(req.params.id);

  if (!record) return next(new AppError('Immobilization not found', 404));

  res.status(204).json({ status: 'success', data: null });
});

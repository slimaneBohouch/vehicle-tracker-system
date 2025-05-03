const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  imei: {
    type: String,
    required: [true, 'Please provide vehicle IMEI'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a vehicle name'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Please provide vehicle model'],
    trim: true
  },
  licensePlate: {
    type: String,
    required: [true, 'Please provide license plate number'],
    trim: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  currentStatus: {
    type: String,
    enum: ['moving', 'stopped', 'immobilized', 'inactive'],
    default: 'inactive'
  },
  lastLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0] // [longitude, latitude]
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    speed: {
      type: Number,
      default: 0
    }
  },
  immobilizationHistory: [
    {
      status: {
        type: Boolean, // true = immobilized, false = mobilized
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      reason: String,
      triggeredBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    }
  ],
  assignedGeofences: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Geofence'
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add index for geospatial queries
vehicleSchema.index({ 'lastLocation.coordinates': '2dsphere' });

module.exports = mongoose.model('Vehicle', vehicleSchema);
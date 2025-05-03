const mongoose = require('mongoose');

const locationPointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  speed: {
    type: Number,
    default: 0
  }
});

const tripSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'interrupted'],
    default: 'active'
  },
  startLocation: locationPointSchema,
  endLocation: locationPointSchema,
  // We don't store all route points here to keep the document size reasonable
  // Detailed route points are stored in the positions collection
  summary: {
    distance: {
      type: Number, // in kilometers
      default: 0
    },
    duration: {
      type: Number, // in minutes
      default: 0
    },
    averageSpeed: {
      type: Number, // in km/h
      default: 0
    },
    maxSpeed: {
      type: Number,
      default: 0
    },
    idleTime: {
      type: Number, // in minutes
      default: 0
    },
    fuelUsed: {
      type: Number, // in liters, if available
    },
    positionsCount: {
      type: Number,
      default: 0
    }
  },
  startAddress: {
    type: String,
    trim: true
  },
  endAddress: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for improved query performance
tripSchema.index({ vehicle: 1, startTime: -1 });
tripSchema.index({ user: 1, startTime: -1 });
tripSchema.index({ status: 1 });
tripSchema.index({ startTime: 1, endTime: 1 });

// Pre-save hook to update the updatedAt field
tripSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Trip', tripSchema);
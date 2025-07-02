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

  summary: {
    distance: {
      type: Number, // Distance calculated by backend (Haversine) in kilometers
      default: 0
    },
    distanceFromOdometer: {
      type: Number, // ✅ Real vehicle distance from Odometer (in meters or km, up to you)
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
      type: Number, // optional, in liters
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

// ✅ Indexes for performance
tripSchema.index({ vehicle: 1, startTime: -1 });
tripSchema.index({ user: 1, startTime: -1 });
tripSchema.index({ status: 1 });
tripSchema.index({ startTime: 1, endTime: 1 });

// ✅ Auto-update updatedAt before save
tripSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Trip', tripSchema);

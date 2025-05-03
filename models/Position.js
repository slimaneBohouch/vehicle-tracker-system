const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  altitude: {
    type: Number,
    default: 0
  },
  accuracy: {
    type: Number, // GPS accuracy in meters
    default: 0
  },
  speed: {
    type: Number, // in km/h
    default: 0
  },
  heading: {
    type: Number, // direction in degrees (0-360)
    min: 0,
    max: 360,
    default: 0
  },
  deviceStatus: {
    ignition: {
      type: Boolean,
      default: false
    },
    battery: {
      type: Number, // battery percentage
      min: 0,
      max: 100
    },
    signal: {
      type: Number, // signal strength percentage
      min: 0,
      max: 100
    }
  },
  trip: {
    type: mongoose.Schema.ObjectId,
    ref: 'Trip'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  serverReceivedAt: {
    type: Date,
    default: Date.now
  }
});

// Add index for geospatial queries
positionSchema.index({ location: '2dsphere' });

// Add indexes for common queries
positionSchema.index({ vehicle: 1, createdAt: -1 });
positionSchema.index({ trip: 1 });

module.exports = mongoose.model('Position', positionSchema);
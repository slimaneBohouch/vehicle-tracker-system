const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['geofenceExit', 'geofenceEntry', 'speedExceeded', 'unauthorizedMovement', 'immobilization', 'lowBattery'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number] // [longitude, latitude]
    }
  },
  speed: {
    type: Number // If speed-related alert
  },
  geofence: {
    type: mongoose.Schema.ObjectId,
    ref: 'Geofence' // If geofence-related alert
  },
  read: {
    type: Boolean,
    default: false
  },
  notificationSent: {
    email: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for improved query performance
alertSchema.index({ vehicle: 1, createdAt: -1 });
alertSchema.index({ user: 1, read: 1 });
alertSchema.index({ type: 1 });

module.exports = mongoose.model('Alert', alertSchema);
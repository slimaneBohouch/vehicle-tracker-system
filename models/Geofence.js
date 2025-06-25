const mongoose = require('mongoose');

const GeofenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['circle', 'polygon'],
    required: true
  },
  // For circular geofences
  center: {
    lat: Number,
    lon: Number
  },
  radius: {
    type: Number,
    min: 0
  },
  // For polygon geofences
  coordinates: [{
    lat: Number,
    lon: Number
  }],
  // Vehicles assigned to this geofence
  vehicles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  }],
  // User who created this geofence
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Active status
  active: {
    type: Boolean,
    default: true
  },
  // Notification settings
  notifyOnExit: {
    type: Boolean,
    default: true
  },
  notifyOnEntry: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Validate that circular geofences have center and radius
GeofenceSchema.pre('save', function(next) {
  if (this.type === 'circle') {
    if (!this.center || !this.radius) {
      return next(new Error('Circular geofences must have center and radius'));
    }
  } else if (this.type === 'polygon') {
    if (!this.coordinates || this.coordinates.length < 3) {
      return next(new Error('Polygon geofences must have at least 3 coordinates'));
    }
  }
  next();
});

module.exports = mongoose.model('Geofence', GeofenceSchema);
const mongoose = require('mongoose');

const geofenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name for this geofence'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['circle', 'polygon'],
    default: 'circle'
  },
  // For circle geofence
  circle: {
    center: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number] // [longitude, latitude]
      }
    },
    radius: {
      type: Number, // in meters
      min: 50,
      max: 10000
    }
  },
  // For polygon geofence
  polygon: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]] // Array of arrays of [longitude, latitude] points
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add geospatial indexes for efficient queries
geofenceSchema.index({ 'circle.center.coordinates': '2dsphere' });
geofenceSchema.index({ 'polygon.coordinates': '2dsphere' });

module.exports = mongoose.model('Geofence', geofenceSchema);
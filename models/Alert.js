const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'SPEED_ALERT', 
      'BATTERY_ALERT', 
      'GEOFENCE_EXIT',
      'GEOFENCE_ENTRY', 
      'TIME_RESTRICTION', 
      'MOVEMENT_ALERT', 
      'SYSTEM_ALERT'
    ]
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    default: {}
  },
  resolved: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
  },
  
  resolvedAt: {
    type: Date
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
AlertSchema.index({ vehicleId: 1, timestamp: -1 });
AlertSchema.index({ type: 1, timestamp: -1 });
AlertSchema.index({ resolved: 1 });

module.exports = mongoose.model('Alert', AlertSchema);

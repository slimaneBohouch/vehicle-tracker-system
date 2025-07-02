const mongoose = require('mongoose');

const statisticSchema = new mongoose.Schema({
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
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  metrics: {
    totalTrips: {
      type: Number,
      default: 0
    },
    totalDistance: {
      type: Number, // in kilometers
      default: 0
    },
    totalDuration: {
      type: Number, // in minutes
      default: 0
    },
    averageSpeed: {
      type: Number, // in km/h
      default: 0
    },
    maxSpeed: {
      type: Number, // in km/h
      default: 0
    },
    idleTime: {
      type: Number, // in minutes
      default: 0
    },
    movementHours: [
      {
        hour: Number, // 0-23
        percentage: Number // percentage of movement in this hour
      }
    ],
    movementDays: [
      {
        day: Number, // 0-6 (Sunday to Saturday)
        percentage: Number // percentage of movement on this day
      }
    ],
    alerts: {
      total: Number,
      byType: {
        geofenceExit: Number,
        geofenceEntry: Number,
        speedExceeded: Number,
        unauthorizedMovement: Number,
        lowBattery: Number
      }
    }
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for common queries
statisticSchema.index({ vehicle: 1, period: 1, startDate: 1, endDate: 1 });
statisticSchema.index({ user: 1, period: 1, startDate: 1 });

module.exports = mongoose.model('Statistic', statisticSchema);
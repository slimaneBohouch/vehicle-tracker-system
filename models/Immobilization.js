const mongoose = require('mongoose');

const immobilizationSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  action: {
    type: String,
    enum: ['immobilize', 'mobilize'],
    required: true
  },
  reason: {
    type: String,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
    }
  },
  commandSent: {
    type: Boolean,
    default: false
  },
  commandAcknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgedAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for common queries
immobilizationSchema.index({ vehicle: 1, createdAt: -1 });
immobilizationSchema.index({ user: 1, createdAt: -1 });
immobilizationSchema.index({ status: 1 });

// Pre-save hook to update the updatedAt field
immobilizationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Immobilization', immobilizationSchema);
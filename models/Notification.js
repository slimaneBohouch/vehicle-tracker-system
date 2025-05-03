const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['alert', 'info', 'success', 'warning', 'error'],
    default: 'info'
  },
  related: {
    model: {
      type: String,
      enum: ['Vehicle', 'Alert', 'Journey', 'Geofence']
    },
    id: {
      type: mongoose.Schema.ObjectId
    }
  },
  read: {
    type: Boolean,
    default: false
  },
  delivered: {
    type: Boolean,
    default: false
  },
  deliveryMethod: {
    type: String,
    enum: ['inApp', 'email', 'sms', 'push'],
    default: 'inApp'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for improved query performance
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
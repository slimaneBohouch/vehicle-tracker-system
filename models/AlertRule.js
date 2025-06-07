const mongoose = require('mongoose');

const alertRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['SPEED_ALERT', 'BATTERY_ALERT', 'GEOFENCE_EXIT', 'GEOFENCE_ENTRY'],
    required: true
  },
  threshold: {
  type: Number,
  required: function () {
    return this.type === 'SPEED_ALERT' || this.type === 'BATTERY_ALERT';
  }
},


  notifications: {
    email: { type: Boolean, default: false },
    app: { type: Boolean, default: true }
  },

  enabled: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AlertRule', alertRuleSchema);

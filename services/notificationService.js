const Notification = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('../Utils/sendEmail');
const socketService = require('./socketService');

/**
 * Create a new notification and send it to the user
 * @param {Object} options - Notification options
 * @param {String} options.userId - User ID
 * @param {String} options.alertId - Optional: Related alert ID
 * @param {String} options.vehicleId - Optional: Related vehicle ID
 * @param {String} options.type - Notification type (alert, info, etc.)
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message
 * @param {Object} options.data - Optional: Extra data (e.g., speed, location)
 * @returns {Promise<Object>} The created notification
 */
async function createNotification(options) {
  try {
    if (!options.userId || !options.message || !options.type) {
      throw new Error('Missing required fields: userId, message, type');
    }

    const notification = await Notification.create({
      user: options.userId,
      title: options.title || getNotificationTypeLabel(options.type),
      message: options.message,
      type: options.type,
      related: options.alertId
        ? { model: 'Alert', id: options.alertId }
        : options.vehicleId
        ? { model: 'Vehicle', id: options.vehicleId }
        : undefined,
      deliveryMethod: 'email'
    });

    // Send email if user has one
    const user = await User.findById(options.userId);
    if (user?.email) {
      try {
        await sendEmail({
          email: user.email,
          subject: `[${getNotificationTypeLabel(options.type)}] Vehicle Notification`,
          message: createEmailContent(notification, options)
        });

        notification.delivered = true;
        await notification.save();
      } catch (emailError) {
        console.error('Email delivery failed:', emailError);
      }
    }

    // Emit WebSocket event
    socketService.emitToUser(options.userId, 'new_notification', {
      notification: notification.toObject()
    });

    return notification;
  } catch (err) {
    console.error('Failed to create notification:', err);
    throw err;
  }
}

async function markAsRead(notificationId, userId) {
  return await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true }
  );
}

async function deleteNotification(notificationId, userId) {
  const result = await Notification.deleteOne({
    _id: notificationId,
    user: userId
  });
  return result.deletedCount > 0;
}

async function getUserNotifications(userId, options = {}) {
  const limit = options.limit || 20;
  const page = options.page || 1;
  const skip = (page - 1) * limit;

  const query = { user: userId };
  if (options.unreadOnly) query.read = false;
  if (options.type) query.type = options.type;
  if (options.vehicleId) query['related.model'] = 'Vehicle';
  if (options.vehicleId) query['related.id'] = options.vehicleId;

  const total = await Notification.countDocuments(query);
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    notifications,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
}

function getNotificationTypeLabel(type) {
  const labels = {
    SPEED_ALERT: 'Speed Limit Exceeded',
    BATTERY_ALERT: 'Low Battery',
    GEOFENCE_EXIT: 'Exited Geofence',
    GEOFENCE_ENTRY: 'Entered Geofence',
    TIME_RESTRICTION: 'Time Restriction Breach',
    MOVEMENT_ALERT: 'Unexpected Movement',
    SYSTEM_ALERT: 'System Issue',
    alert: 'Alert',
    info: 'Information',
    success: 'Success',
    warning: 'Warning',
    error: 'Error'
  };
  return labels[type] || type;
}

function createEmailContent(notification, options) {
  const time = new Date(notification.createdAt).toLocaleString();
  const type = getNotificationTypeLabel(notification.type);

  return `
    <h2>${type}</h2>
    <p><strong>Time:</strong> ${time}</p>
    <p><strong>Message:</strong> ${notification.message}</p>
    ${options.data?.location ? `
      <p><strong>Location:</strong> 
        <a href="https://www.google.com/maps?q=${options.data.location.lat},${options.data.location.lon}" target="_blank">
          View on Map
        </a>
      </p>` : ''}
    <p>This is an automated notification from the Vehicle Tracking System.</p>
  `;
}

/**
 * Delete notification by ID
 * @param {String} notificationId - Notification ID
 * @param {String} userId - User ID
 * @returns {Promise<Boolean>} Success status
 */
async function deleteNotification(notificationId, userId) {
  try {
    const result = await Notification.deleteOne({
      _id: notificationId,
      userId: userId
    });
    
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

module.exports = {
  createNotification,
  markAsRead,
  getUserNotifications,
  deleteNotification,
  getNotificationTypeLabel
};
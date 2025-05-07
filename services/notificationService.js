// notificationService.js - Service for handling notifications

const Notification = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('../Utils/sendEmail');
const socketService = require('./socketService');

/**
 * Create a new notification and send it to the user
 * @param {Object} options - Notification options
 * @param {String} options.userId - User ID
 * @param {String} options.alertId - Alert ID (optional)
 * @param {String} options.vehicleId - Vehicle ID (optional)
 * @param {String} options.type - Notification type
 * @param {String} options.message - Notification message
 * @param {Object} options.data - Additional data (optional)
 * @returns {Promise<Object>} Created notification
 */
async function createNotification(options) {
  try {
    // Validate required fields
    if (!options.userId || !options.type || !options.message) {
      throw new Error('Missing required notification fields');
    }

    // Create notification record
    const notification = await Notification.create({
      userId: options.userId,
      alertId: options.alertId,
      vehicleId: options.vehicleId,
      type: options.type,
      message: options.message,
      data: options.data || {}
    });

    // Get user for email sending
    const user = await User.findById(options.userId);
    if (!user || !user.email) {
      console.error(`Cannot send email: User ${options.userId} not found or has no email`);
      return notification;
    }

    // Send email notification
    try {
      await sendEmail({
        email: user.email,
        subject: `Vehicle Alert: ${getNotificationTypeLabel(options.type)}`,
        message: createEmailContent(notification, options)
      });

      // Update notification with email sent status
      notification.emailSent = true;
      notification.emailSentAt = new Date();
      notification.deliveryStatus = 'SENT';
      await notification.save();

      console.log(`Email notification sent to ${user.email} for ${options.type}`);
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      notification.deliveryStatus = 'FAILED';
      await notification.save();
    }

    // Send real-time notification via WebSocket
    socketService.emitToUser(options.userId, 'new_notification', {
      notification: notification.toObject()
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 * @param {String} notificationId - Notification ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Updated notification
 */
async function markAsRead(notificationId, userId) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      throw new Error('Notification not found or does not belong to user');
    }

    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Get notifications for a user
 * @param {String} userId - User ID
 * @param {Object} options - Query options
 * @param {Number} options.limit - Result limit
 * @param {Number} options.page - Page number
 * @param {Boolean} options.unreadOnly - Only unread notifications
 * @returns {Promise<Object>} Notifications and count
 */
async function getUserNotifications(userId, options = {}) {
  try {
    const limit = options.limit || 20;
    const page = options.page || 1;
    const skip = (page - 1) * limit;

    const query = { userId };
    if (options.unreadOnly) {
      query.read = false;
    }

    if (options.vehicleId) {
      query.vehicleId = options.vehicleId;
    }

    if (options.type) {
      query.type = options.type;
    }

    // Count total matching notifications
    const total = await Notification.countDocuments(query);

    // Get paginated notifications sorted by timestamp
    const notifications = await Notification.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'vehicleId',
        select: 'name licensePlate imei'
      });

    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
}

/**
 * Get human-readable notification type label
 * @param {String} type - Notification type
 * @returns {String} Human-readable label
 */
function getNotificationTypeLabel(type) {
  const labels = {
    'SPEED_ALERT': 'Speed Limit Exceeded',
    'BATTERY_ALERT': 'Low Battery Warning',
    'GEOFENCE_EXIT': 'Geofence Exit Alert',
    'GEOFENCE_ENTRY': 'Geofence Entry Alert',
    'TIME_RESTRICTION': 'Movement Outside Allowed Hours',
    'MOVEMENT_ALERT': 'Unexpected Movement',
    'SYSTEM_ALERT': 'System Alert',
    'INFO': 'Information'
  };

  return labels[type] || type;
}

/**
 * Create HTML email content for notification
 * @param {Object} notification - Notification object
 * @param {Object} options - Additional options and data
 * @returns {String} HTML email content
 */
function createEmailContent(notification, options) {
  const notificationTime = new Date(notification.timestamp).toLocaleString();
  const notificationType = getNotificationTypeLabel(notification.type);
  
  // Vehicle info section
  let vehicleInfo = '';
  if (options.vehicleInfo) {
    vehicleInfo = `
      <p><strong>Vehicle:</strong> ${options.vehicleInfo.name} (${options.vehicleInfo.licensePlate})</p>
    `;
  }
  
  // Location info section
  let locationInfo = '';
  if (options.data && options.data.location) {
    const { lat, lon } = options.data.location;
    if (lat && lon) {
      locationInfo = `
        <p><strong>Location:</strong> 
          <a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank">
            View on Map
          </a>
        </p>
      `;
    }
  }
  
  // Additional info based on notification type
  let additionalInfo = '';
  if (options.data) {
    switch (notification.type) {
      case 'SPEED_ALERT':
        additionalInfo = `
          <p><strong>Speed:</strong> ${options.data.speed} km/h</p>
          <p><strong>Speed Limit:</strong> ${options.data.threshold || 70} km/h</p>
        `;
        break;
      case 'BATTERY_ALERT':
        additionalInfo = `
          <p><strong>Battery Level:</strong> ${options.data.battery}%</p>
          <p><strong>Threshold:</strong> ${options.data.threshold || 15}%</p>
        `;
        break;
      case 'GEOFENCE_EXIT':
        additionalInfo = `
          <p><strong>Geofence:</strong> ${options.data.geofenceName || 'Unknown'}</p>
        `;
        break;
      case 'TIME_RESTRICTION':
        additionalInfo = `
          <p><strong>Restricted Hours:</strong> ${options.data.restrictedTimeRange || '22:00 - 06:00'}</p>
          <p><strong>Movement time:</strong> ${new Date(options.data.time).toLocaleTimeString()}</p>
        `;
        break;
    }
  }

  // Create HTML email template
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 15px; border-bottom: 3px solid #007bff; }
        .content { padding: 20px 0; }
        .footer { font-size: 12px; color: #6c757d; margin-top: 30px; text-align: center; }
        .alert-badge { 
          display: inline-block;
          padding: 5px 10px;
          background-color: #dc3545;
          color: white;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Vehicle Alert Notification</h2>
        </div>
        <div class="content">
          <p><span class="alert-badge">${notificationType}</span></p>
          <p><strong>Time:</strong> ${notificationTime}</p>
          ${vehicleInfo}
          ${locationInfo}
          ${additionalInfo}
          <p><strong>Message:</strong> ${notification.message}</p>
          <p>Please log in to your vehicle tracking dashboard for more details.</p>
        </div>
        <div class="footer">
          <p>This is an automated alert from your Vehicle Tracking System.</p>
          <p>If you have any questions, please contact support.</p>
        </div>
      </div>
    </body>
    </html>
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
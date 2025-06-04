const notificationService = require('../services/notificationService');
const Vehicle = require('../models/Vehicle');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Get all notifications for the logged-in user
 * @route GET /api/notifications
 * @access Private
 */
exports.getNotifications = asyncHandler(async (req, res) => {
  const options = {
    limit: parseInt(req.query.limit) || 20,
    page: parseInt(req.query.page) || 1,
    unreadOnly: req.query.unread === 'true',
    vehicleId: req.query.vehicleId,
    type: req.query.type
  };

  const result = await notificationService.getUserNotifications(req.user.id, options);

  res.status(200).json({
    success: true,
    count: result.notifications.length,
    pagination: result.pagination,
    data: result.notifications
  });
});

/**
 * Mark a notification as read
 * @route PUT /api/notifications/:id/read
 * @access Private
 */
exports.markNotificationAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    data: notification
  });
});

/**
 * Mark all notifications as read
 * @route PUT /api/notifications/read-all
 * @access Private
 */
exports.markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const filter = { userId: req.user.id, read: false };
  
  if (req.query.vehicleId) {
    filter.vehicleId = req.query.vehicleId;
  }
  
  if (req.query.type) {
    filter.type = req.query.type;
  }
  
  const result = await Notification.updateMany(filter, { read: true });
  
  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} notifications marked as read`,
    count: result.modifiedCount
  });
});

/**
 * Delete a notification
 * @route DELETE /api/notifications/:id
 * @access Private
 */
exports.deleteNotification = asyncHandler(async (req, res) => {
  const success = await notificationService.deleteNotification(req.params.id, req.user.id);
  
  if (!success) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found or not authorized'
    });
  }
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

/**
 * Test notification system by sending a test notification
 * @route POST /api/notifications/test
 * @access Private
 */
exports.testNotification = asyncHandler(async (req, res) => {
  // Verify if user has vehicles
  const vehicles = await Vehicle.find({ user: req.user.id });
  
  if (!vehicles.length) {
    return res.status(400).json({
      success: false,
      message: 'You must have at least one vehicle to test notifications'
    });
  }
  
  // Use the first vehicle for the test
  const vehicle = vehicles[0];
  
  // Create a test notification
  const notification = await notificationService.createNotification({
    userId: req.user.id,
    vehicleId: vehicle._id,
    type: 'INFO',
    message: `This is a test notification for vehicle ${vehicle.name}`,
    data: {
      isTest: true,
      vehicle: {
        name: vehicle.name,
        licensePlate: vehicle.licensePlate
      }
    }
  });
  
  res.status(200).json({
    success: true,
    message: 'Test notification sent',
    data: notification
  });
});

/**
 * Get notification count for the logged-in user
 * @route GET /api/notifications/count
 * @access Private
 */
exports.getNotificationCount = asyncHandler(async (req, res) => {
  const filter = { userId: req.user.id };
  
  if (req.query.unread === 'true') {
    filter.read = false;
  }
  
  const count = await Notification.countDocuments(filter);
  
  res.status(200).json({
    success: true,
    count
  });
});

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  testNotification,
  getNotificationCount
} = require('../controllers/notificationController');

// Protect all routes
router.use(protect);

// Get notifications and counts
router.get('/', getNotifications);
router.get('/count', getNotificationCount);

// Mark notifications as read
router.put('/:id/read', markNotificationAsRead);
router.put('/read-all', markAllNotificationsAsRead);

// Delete notification
router.delete('/:id', deleteNotification);

// Test notification system
router.post('/test', testNotification);

module.exports = router;

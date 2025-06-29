const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  updateUserStatus,
  updateUserRole,
  getUserById,
  getUserVehicleStats,
  resetAlertCounter,
  deleteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Get users
router.get('/', protect, authorize('admin', 'superadmin'), getAllUsers);
router.post('/reset-alert-counter', protect, resetAlertCounter);
router.delete('/delete-user/:id', protect, deleteUser);
// Update status (admin can only affect users, superadmin affects all)
router.patch('/:id/status', protect, authorize('admin', 'superadmin'), updateUserStatus);

// Update role (only superadmin)
router.patch('/:id/role', protect, authorize('superadmin'), updateUserRole);
router.get('/:id', protect, authorize('admin', 'superadmin'), getUserById);
router.get('/:id/stats', protect, authorize('admin', 'superadmin'), getUserVehicleStats);


module.exports = router;
const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  updateUserStatus,
  updateUserRole,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Get users
router.get('/', protect, authorize('admin', 'superadmin'), getAllUsers);

// Update status (admin can only affect users, superadmin affects all)
router.patch('/:id/status', protect, authorize('admin', 'superadmin'), updateUserStatus);

// Update role (only superadmin)
router.patch('/:id/role', protect, authorize('superadmin'), updateUserRole);

module.exports = router;
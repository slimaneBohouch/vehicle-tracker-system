const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const ErrorResponse = require('../Utils/errorResponse');

exports.getAllUsers = async (req, res, next) => {
  try {
    // Exclude current user from the list
    const users = await User.find({ _id: { $ne: req.user.id } }).select(
      'name email role status company lastActive createdAt'
    );
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const currentUser = req.user;
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (targetUser.id === currentUser.id) {
      return res.status(403).json({ success: false, message: 'You cannot change your own status.' });
    }

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    // Admin cannot deactivate another admin or superadmin
    if (
      currentUser.role === 'admin' &&
      (targetUser.role === 'admin' || targetUser.role === 'superadmin')
    ) {
      return res.status(403).json({ success: false, message: 'Admins cannot deactivate other admins or superadmins.' });
    }

    targetUser.status = status;
    await targetUser.save();

    res.status(200).json({ success: true, data: targetUser });
  } catch (error) {
    next(error);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const currentUser = req.user;
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (targetUser.id === currentUser.id) {
      return res.status(403).json({ success: false, message: 'You cannot change your own role.' });
    }

    const validRoles = ['user', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    // Only superadmin can change roles
    if (currentUser.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only superadmin can change roles.' });
    }

    targetUser.role = role;
    await targetUser.save();

    res.status(200).json({ success: true, data: targetUser });
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.getUserVehicles = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const vehicles = await Vehicle.find({ user: userId }).select('name licensePlate currentStatus imei');

    res.status(200).json({
      success: true,
      data: vehicles,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserVehicleStats = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Count total vehicles owned by the user
    const totalVehicles = await Vehicle.countDocuments({ user: userId });

    // Count vehicles with currentStatus = 'moving'
    const movingVehicles = await Vehicle.countDocuments({ user: userId, currentStatus: 'moving' });

    res.status(200).json({
      success: true,
      data: {
        totalVehicles,
        movingVehicles
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.resetAlertCounter = async (req, res) => {
  try {
    await req.user.updateOne({ alertCounter: 0 });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset alert counter' });
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const currentUser = req.user; // Authenticated user making the request
    const targetUser = await User.findById(req.params.id);

    // Check if target user exists
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deleting yourself
    if (targetUser.id === currentUser.id) {
      return res.status(403).json({ success: false, message: 'You cannot delete your own account.' });
    }

    // Only superadmin can delete users
    if (currentUser.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only superadmin can delete users.' });
    }

    // Prevent deleting another superadmin
    if (targetUser.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Superadmin cannot delete another superadmin.' });
    }

    // Perform deletion
    await targetUser.deleteOne();

    res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
exports.getAllUsersExceptSuperadmins = async (req, res, next) => {
  try {
    const users = await User.find({ role: { $ne: 'superadmin' } })
      .select('name email role');

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};




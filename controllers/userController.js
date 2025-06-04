const User = require('../models/User');
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


const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const ErrorResponse = require('../Utils/errorResponse');
const User = require('../models/User');

// Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    // ✅ Block if user is inactive
    if (user.status === 'inactive') {
      return next(new ErrorResponse('Your account has been deactivated', 401));
    }

    // ✅ Update lastActive only if more than 5 minutes passed
    const now = new Date();
    const diffMs = now - new Date(user.lastActive || 0);

    if (diffMs > 1000 * 60 * 5) {
      user.lastActive = now;
      await user.save();
    }

    req.user = user;
    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ErrorResponse(`User role ${req.user.role} is not authorized to access this route`, 403));
    }
    next();
  };
};

const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../Utils/errorResponse');
const crypto = require('crypto');
const sendEmail = require('../Utils/sendEmail');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, company } = req.body;

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    company,
  });

  sendTokenResponse(user, 200, res);
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  // Check for user
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  sendTokenResponse(user, 200, res);
});

// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
const fs = require("fs");
const path = require("path");

exports.updateDetails = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    company: req.body.company
  };

  // Handle uploaded file
  if (req.file) {
    // Optionally delete the old photo file
    if (user.photo) {
      const oldPhotoPath = path.join(__dirname, "..", "public", user.photo);
      fs.unlink(oldPhotoPath, (err) => {
        if (err) console.error("Error deleting old photo:", err.message);
      });
    }

    fieldsToUpdate.photo = `/uploads/${req.file.filename}`;
  }

  // Handle "null" string from frontend to delete the photo
  if (req.body.photo === "null" && !req.file && user.photo) {
    const oldPhotoPath = path.join(__dirname, "..", "public", user.photo);
    fs.unlink(oldPhotoPath, (err) => {
      if (err) console.error("Error deleting photo:", err.message);
    });
    fieldsToUpdate.photo = null;
  }

  // Filter out undefined fields
  Object.keys(fieldsToUpdate).forEach(
    (key) => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  const updatedUser = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: updatedUser,
  });
});


// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorResponse('There is no user with that email', 404));
  }

  // Get reset token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  user.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

// Create reset URL that points to your frontend
const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;


const message = `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f6f6f6; padding: 20px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table width="600" cellpadding="20" cellspacing="0" style="background-color: #ffffff; border-radius: 6px;">
            <tr>
              <td>
                <h2 style="color: #333;">Hello ${user.name},</h2>
                <p style="color: #555; font-size: 16px;">
                  You requested a password reset for your <strong>VehicleTracking</strong> account.
                </p>
                <p style="color: #555; font-size: 16px;">
                  Click the button below to reset your password:
                </p>
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" target="_blank" style="
                    background-color:rgba(0, 0, 0, 0.81);
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 4px;
                    font-weight: bold;
                  ">
                    Reset Password
                  </a>
                </p>
                <p style="color: #999; font-size: 14px;">
                  If you didn’t request this, you can safely ignore this email.
                </p>
                <p style="color: #555; font-size: 16px;">
                  Best regards,<br/>
                  <strong>VehicleTracking Support Team</strong>
                </p>
              </td>
            </tr>
          </table>
          <p style="color: #aaa; font-size: 12px; margin-top: 10px;">
            &copy; ${new Date().getFullYear()} VehicleTracking. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;


  try {
    await sendEmail({
      email: user.email,
      subject: 'Password reset token',
      message
    });

    res.status(200).json({ success: true, data: 'Email sent' });
  } catch (err) {
    console.log(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Reset password
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid token', 400));
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token
    });
};
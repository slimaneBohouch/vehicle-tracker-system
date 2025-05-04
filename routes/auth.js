const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updateDetails,
  updatePassword
} = require('../controllers/auth');
const upload = require('../middleware/upload');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, upload.single('photo'), updateDetails);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

module.exports = router;

//POST /api/v1/auth/register - Register a new user
//POST /api/v1/auth/login - Login user
//GET /api/v1/auth/logout - Logout user
//GET /api/v1/auth/me - Get current user (protected)
//PUT /api/v1/auth/updatedetails - Update user details (protected)
//PUT /api/v1/auth/updatepassword - Update password (protected)
//POST /api/v1/auth/forgotpassword - Request password reset
//PUT /api/v1/auth/resetpassword/:resettoken - Reset password
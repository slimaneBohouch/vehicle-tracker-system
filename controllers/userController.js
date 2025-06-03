// controllers/userController.js
const User = require('../models/User')

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('name email role status company lastActive createdAt')
    res.status(200).json({ success: true, data: users })
  } catch (error) {
    next(error)
  }
}

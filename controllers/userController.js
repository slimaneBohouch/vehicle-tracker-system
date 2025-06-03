// controllers/userController.js
const User = require('../models/User')

exports.getAllUsers = async (req, res, next) => {
  try {
   
    const users = await User.find({ _id: { $ne: req.user.id } }).select('name email role status company lastActive createdAt')
    res.status(200).json({ success: true, data: users })
  } catch (error) {
    next(error)
  }
}

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' })
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.status(200).json({ success: true, data: user })
  } catch (error) {
    next(error)
  }
}
// routes/userRoutes.js
const express = require('express')
const router = express.Router()
const { getAllUsers } = require('../controllers/userController')

// GET /api/v1/users
router.get('/', getAllUsers)

module.exports = router
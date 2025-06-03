const express = require('express')
const router = express.Router()
const { getAllUsers, updateUserStatus } = require('../controllers/userController')


router.get('/', getAllUsers)
router.patch('/:id/status', updateUserStatus)

module.exports = router
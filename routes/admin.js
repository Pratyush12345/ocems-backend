const express = require('express')
const router = express.Router()
const adminController = require('../controllers/adminController')
const checkAuth = require('../middlewares/check-auth')

router.post('/signup', checkAuth, adminController.signUp)

module.exports = router
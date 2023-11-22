const express = require('express')
const router = express.Router()
const officerController = require('../controllers/officerController')
const checkAuth = require('../middlewares/check-auth')

router.post('/signup', checkAuth, officerController.signUp)

module.exports = router
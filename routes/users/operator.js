const express = require('express')
const router = express.Router()
const operatorController = require('../../controllers/users/operatorController')
const checkAuth = require('../../middlewares/check-auth')

router.post('/signup', checkAuth, operatorController.signUp)

module.exports = router
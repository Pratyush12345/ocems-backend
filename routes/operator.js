const express = require('express')
const router = express.Router()
const operatorController = require('../controllers/operatorController')
const checkAuth = require('../middlewares/check-auth')

router.get('/getoperator', checkAuth, operatorController.getOperator)
router.post('/signup', checkAuth, operatorController.signUp)

module.exports = router
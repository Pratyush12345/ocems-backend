const express = require('express')
const router = express.Router()
const alertController = require('../../controllers/plant/alertController')
const checkAuth = require('../../middlewares/check-auth')

router.get('/', checkAuth, alertController.getAlerts)
router.get('/count', checkAuth, alertController.alertsCount)
router.post('/test', alertController.test)

module.exports = router
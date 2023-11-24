const express = require('express')
const router = express.Router()
const superAdminController = require('../controllers/superAdminController')

router.get('/getsuperadmin', superAdminController)
router.post('/signup', superAdminController.signUp)

module.exports = router
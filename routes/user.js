const express = require('express')
const router = express.Router()
const adminController = require('../controllers/adminController')
const userContoller = require('../controllers/userController')
const checkAuth = require('../middlewares/check-auth')

// add auth check
router.patch('/update/:useruid', adminController.updateAdmin)
router.delete('/delete/:useruid', adminController.deleteAdmin)

module.exports = router
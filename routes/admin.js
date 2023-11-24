const express = require('express')
const router = express.Router()
const adminController = require('../controllers/adminController')
const checkAuth = require('../middlewares/check-auth')

router.get('/getadmin', checkAuth, adminController.getAdmin)
router.post('/signup', checkAuth, adminController.signUp)

// add auth check
router.patch('/update', adminController.updateAdmin)
router.delete('/delete', adminController.deleteAdmin)

module.exports = router
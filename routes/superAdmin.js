const express = require('express')
const router = express.Router()
const superAdminController = require('../controllers/superAdminController')
const checkAuth = require('../middlewares/check-auth')

router.get('/getsuperadmin', checkAuth, superAdminController.getSuperAdmin)
router.post('/signup', superAdminController.signUp)
router.patch('/update', checkAuth, superAdminController.updateSuperAdmin)
router.patch('/delete', checkAuth, superAdminController.deleteSuperAdmin)

module.exports = router
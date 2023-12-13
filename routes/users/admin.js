const express = require('express')
const router = express.Router()
const adminController = require('../../controllers/users/adminController')
const checkAuth = require('../../middlewares/check-auth')


router.get('/getadmin', checkAuth, adminController.getAdmin)
router.post('/signup', checkAuth, adminController.signUp)

router.patch('/update', checkAuth, adminController.updateAdmin)
router.delete('/delete', checkAuth, adminController.deleteAdmin)

module.exports = router
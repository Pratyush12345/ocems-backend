const express = require('express')
const router = express.Router()
const plantController = require('../../controllers/plant/plantController')
const linkedAccountController = require('../../controllers/plant/linkedAccountController')
const checkAuth = require('../../middlewares/check-auth')

router.use('/instrument', require('./instrument'))
router.use('/chamber', require('./chamber'))

// Department Access routes
router.get('/department', checkAuth, plantController.getDepartmentAccess)
router.patch('/department/update', checkAuth, plantController.updateDepartmentAccess)
router.delete('/department/delete', checkAuth, plantController.deleteDepartmentAccess)

// Plant routes
router.get('/', plantController.getPlant)
router.post('/create', plantController.createPlant)

// Payment routes
router.post('/create/linkedac', linkedAccountController.createLinkedAccount)
router.post('/create/stakeholder', linkedAccountController.createStakeholder)
router.post('/accepttnc', linkedAccountController.acceptTnc)
router.post('/addBankAccount', linkedAccountController.addBankDetails)

module.exports = router
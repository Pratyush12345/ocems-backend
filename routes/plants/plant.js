const express = require('express')
const router = express.Router()
const plantController = require('../../controllers/plant/plantController')
const checkAuth = require('../../middlewares/check-auth')

// Department Access routes
router.get('/department', checkAuth, plantController.getDepartmentAccess)
router.patch('/department/update', checkAuth, plantController.updateDepartmentAccess)
router.delete('/department/delete', checkAuth, plantController.deleteDepartmentAccess)

// Plant routes
router.post('/create', plantController.createPlant)

// Payment routes
router.post('/create/linkedac', plantController.createLinkedAccount)
router.post('/create/stakeholder', plantController.createStakeholder)
router.post('/accepttnc', plantController.acceptTnc)
router.post('/addBankAccount', plantController.addBankDetails)

module.exports = router
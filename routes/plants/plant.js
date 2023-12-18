const express = require('express')
const router = express.Router()
const plantController = require('../../controllers/plant/plantController')
const checkAuth = require('../../middlewares/check-auth')

router.get('/department', checkAuth, plantController.getDepartmentAccess)
router.post('/create', plantController.createPlant)
router.post('/create/linkedac', plantController.createLinkedAccount)
router.post('/create/stakeholder', plantController.createStakeholder)
router.post('/accepttnc', plantController.acceptTnc)
router.post('/addBankAccount', plantController.addBankDetails)

module.exports = router
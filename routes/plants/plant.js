const express = require('express')
const router = express.Router()
const plantController = require('../../controllers/plant/plantController')
const linkedAccountController = require('../../controllers/plant/linkedAccountController')
const checkAccess = require('../../middlewares/check-access')

const departmentAccess = {
    read: ['Department-Read', 'Department-Write'],
    write: ['Department-Write']
}

const accessCheck = (isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed) => {
    return (req, res, next) => {
        checkAccess(departmentAccess, req.method, isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed)(req, res, next);
    };
}

router.use('/instrument', require('./instrument'))
router.use('/chamber', require('./chamber'))
router.use('/alert', require('./alert'))
router.use('/sludge', require('./sludge'))

// Department Access routes
router.get('/department', accessCheck(), plantController.getDepartmentAccess)
router.patch('/department/update', accessCheck(), plantController.updateDepartmentAccess)
router.delete('/department/delete', accessCheck(), plantController.deleteDepartmentAccess)

// Plant routes 
// router.get('/', plantController.getPlant)

router.post('/create', accessCheck(false, true, true), plantController.createPlant)

// Payment routes
router.post('/create/linkedac', accessCheck(false, true, true), linkedAccountController.createLinkedAccount)
router.post('/create/stakeholder', accessCheck(false, true, true), linkedAccountController.createStakeholder)
router.post('/accepttnc', accessCheck(false, true, true), linkedAccountController.acceptTnc)
router.post('/addBankAccount', accessCheck(false, true, true), linkedAccountController.addBankDetails)

module.exports = router
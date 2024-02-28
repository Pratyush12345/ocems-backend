const express = require('express')
const router = express.Router()
const alertController = require('../../controllers/plant/alertController')
const checkAccess = require('../../middlewares/check-access')
const departmentAccess = {
    read: ['Process-Read', 'Process-Write'],
    write: ['Process-Write']
}

const accessCheck = (isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed) => {
    return (req, res, next) => {
        checkAccess(departmentAccess, req.method, isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed)(req, res, next);
    };
}

router.get('/', accessCheck(), alertController.getAlerts)
router.get('/count', accessCheck(), alertController.alertsCount)
// router.post('/test', alertController.test)

module.exports = router
const express = require('express')
const router = express.Router()
const sludgeController = require('../../controllers/plant/sludgeController')
const checkAccess = require('../../middlewares/check-access')
const departmentAccess = {
    read: ['Reports-Read', 'Reports-Write'],
    write: ['Reports-Write']
}

const accessCheck = (isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed) => {
    return (req, res, next) => {
        checkAccess(departmentAccess, req.method, isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed)(req, res, next);
    };
}

router.get('/', accessCheck(), sludgeController.getSludge)
router.post('/create', accessCheck(), sludgeController.createSludge)
router.patch('/update', accessCheck(), sludgeController.updateSludge)
router.delete('/delete', accessCheck(), sludgeController.deleteSludge)

module.exports = router
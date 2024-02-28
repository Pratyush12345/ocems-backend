const express = require('express')
const router = express.Router()
const chamberController = require('../../controllers/plant/chamberController')
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

router.get('/', accessCheck(), chamberController.getChamber)
router.post('/add', accessCheck(), chamberController.createChamber)
router.patch('/update', accessCheck(), chamberController.updateChamber)
router.patch('/update/position', accessCheck(), chamberController.swapChamberPosition)
router.delete('/delete/:chamberID', accessCheck(), chamberController.deleteChamber)

module.exports = router
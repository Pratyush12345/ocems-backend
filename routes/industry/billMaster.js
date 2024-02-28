const express = require('express')
const router = express.Router()
const billMasterController = require('../../controllers/industry/billMasterController')
const checkAccess = require('../../middlewares/check-access')

const departmentAccess = {
    read: ['Industry-Read', 'Industry-Write', 'Bill-Read'],
    write: ['Bill-Write']
}

const accessCheck = (isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed) => {
    return (req, res, next) => {
        checkAccess(departmentAccess, req.method, isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed)(req, res, next);
    };
}

router.get('/types', accessCheck(), billMasterController.getMasterCopiesTypes)
router.get('/', accessCheck(), billMasterController.getMasterCopies)
router.post('/create', accessCheck(), billMasterController.createCopy)
router.patch('/update', accessCheck(), billMasterController.updateCopy)
router.delete('/delete/:id', accessCheck(),billMasterController.deleteCopy)

module.exports = router
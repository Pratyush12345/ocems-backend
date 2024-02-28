const express = require('express')
const router = express.Router()
const flowController = require('../../controllers/industry/flowController')
const checkAccess = require('../../middlewares/check-access')
const departmentAccess = {
    read: ['Industry-Read', 'Industry-Write'],
    write: ['Industry-Write']
}

const accessCheck = (isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed) => {
    return (req, res, next) => {
        checkAccess(departmentAccess, req.method, isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed)(req, res, next);
    };
}

router.get('/', accessCheck(), flowController.getAllFlowData)
router.get('/latest', accessCheck(), flowController.getLatestFlowData)
router.post('/add/bulk/apid', accessCheck(), flowController.addapiID)

module.exports = router
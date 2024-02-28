const express = require('express')
const router = express.Router()
const industryController = require('../../controllers/industry/industryController')
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

router.use('/bill', require('./bill'))
router.use('/notice', require('./notice'))
router.use('/flow', require('./flow'))

// router.post('/signup', industryController.signUp) // ! Shifted to Public routes
router.get('/', accessCheck(true), industryController.getRequests)
router.get('/requests', accessCheck(), industryController.getUnapprovedRequests)
router.post('/approve/:uid', accessCheck(), industryController.approveRequest)
router.post('/reject/:uid', accessCheck(), industryController.rejectRequest)
router.post('/bulkadd', accessCheck(), industryController.bulkUpload)
router.delete('/delete/:uid', accessCheck(), industryController.deleteIndustry)

module.exports = router
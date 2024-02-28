const express = require('express')
const router = express.Router()
const superAdminController = require('../../controllers/users/superAdminController')
const checkAccess = require('../../middlewares/check-access')
const departmentAccess = {
    read: [],
    write: []
}

const accessCheck = (isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed) => {
    return (req, res, next) => {
        checkAccess(departmentAccess, req.method, isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed)(req, res, next);
    };
}

router.get('/getsuperadmin', accessCheck(false,true,true), superAdminController.getSuperAdmin)
// router.post('/signup', superAdminController.signUp)
router.patch('/update', accessCheck(false,true,true), superAdminController.updateSuperAdmin)
router.patch('/delete', accessCheck(false,true,true), superAdminController.deleteSuperAdmin)

module.exports = router
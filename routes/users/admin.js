const express = require('express')
const router = express.Router()
const adminController = require('../../controllers/users/adminController')
const checkAccess = require('../../middlewares/check-access')
const departmentAccess = {
    read: [],
    write: []
}

const accessCheck = (
        isIndustryAccessAllowed, 
        isPlantAccessAllowed, 
        isOnlySuperAdminAccessAllowed,
        isAllPlantRolesAllowed
    ) => {
    return (req, res, next) => {
        checkAccess(departmentAccess, req.method, isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed, isAllPlantRolesAllowed)(req, res, next);
    };
}

router.get('/getadmin', accessCheck(false,true,false,true), adminController.getAdmin)
router.post('/signup', accessCheck(false,true,true), adminController.signUp)

router.patch('/update', accessCheck(), adminController.updateAdmin)
router.delete('/delete/:adminuid', accessCheck(false,true,true), adminController.deleteAdmin)

module.exports = router
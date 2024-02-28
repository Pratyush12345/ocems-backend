const express = require('express')
const router = express.Router()
const operatorController = require('../../controllers/users/operatorController')
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

router.post('/signup', accessCheck(), operatorController.signUp)

module.exports = router
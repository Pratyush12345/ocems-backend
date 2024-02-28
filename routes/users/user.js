const express = require('express')
const router = express.Router()
const userContoller = require('../../controllers/users/userController')
const checkAccess = require('../../middlewares/check-access')
const departmentAccess = {
    read: [],
    write: []
}

router.get('/', checkAccess(departmentAccess), userContoller.getUsers)
router.get('/:uid', checkAccess(departmentAccess,false,true,false,true), userContoller.getUser)

router.patch('/update/password', checkAccess(departmentAccess), userContoller.passwordReset)
router.patch('/update/:useruid', checkAccess(departmentAccess), userContoller.updateUser)
router.delete('/delete/:useruid', checkAccess(departmentAccess), userContoller.deleteUser)

module.exports = router
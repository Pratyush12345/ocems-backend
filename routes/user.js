const express = require('express')
const router = express.Router()
const userContoller = require('../controllers/users/userController')
const checkAuth = require('../middlewares/check-auth')

router.get('/', userContoller.getUsers)
router.get('/:uid', userContoller.getUser)

router.patch('/update/password', checkAuth, userContoller.passwordReset)
router.patch('/update/:useruid', checkAuth, userContoller.updateUser)
router.delete('/delete/:useruid', checkAuth, userContoller.deleteUser)

module.exports = router
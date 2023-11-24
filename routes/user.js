const express = require('express')
const router = express.Router()
const adminController = require('../controllers/adminController')
const userContoller = require('../controllers/userController')
const checkAuth = require('../middlewares/check-auth')

router.get('/', userContoller.getUsers)
router.get('/:uid', userContoller.getUser)

router.patch('/update/:useruid', checkAuth, userContoller.updateUser)
router.delete('/delete/:useruid', checkAuth, userContoller.deleteUser)

module.exports = router
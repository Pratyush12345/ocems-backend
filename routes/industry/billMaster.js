const express = require('express')
const router = express.Router()
const billMasterController = require('../../controllers/industry/billMasterController')
const checkAuth = require('../../middlewares/check-auth')

router.get('/', checkAuth, billMasterController.getMasterCopies)
router.post('/create', checkAuth, billMasterController.createCopy)
router.patch('/update', checkAuth, billMasterController.updateCopy)
router.delete('/delete/:id', checkAuth, billMasterController.deleteCopy)

module.exports = router
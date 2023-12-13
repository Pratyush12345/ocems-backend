const express = require('express')
const router = express.Router()
const billMasterController = require('../../controllers/industry/billMasterController')
const checkAuth = require('../../middlewares/check-auth')

// router.get('/', checkAuth, billMasterController.getMasterCopies)
// router.post('/create', checkAuth, billMasterController.createCopy)
// router.patch('/update', checkAuth, billMasterController.updateCopy)
// router.delete('/delete', checkAuth, billMasterController.deleteCopy)

router.get('/', billMasterController.getMasterCopies)
router.post('/create', billMasterController.createCopy)
router.patch('/update', billMasterController.updateCopy)
router.delete('/delete/:id', billMasterController.deleteCopy)

module.exports = router
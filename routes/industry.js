const express = require('express')
const router = express.Router()
const checkAuth = require('../middlewares/check-auth')
const industryController = require('../controllers/industryController')

router.post('/signup', industryController.signUp)
router.get('/', checkAuth, industryController.getRequests)
router.post('/approve', checkAuth, industryController.approveRequest)
router.post('/reject', checkAuth, industryController.rejectRequest)
router.post('/bulkadd', checkAuth, industryController.bulkUpload)
router.delete('/delete/:uid', checkAuth, industryController.deleteIndustry)

module.exports = router
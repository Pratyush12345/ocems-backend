const express = require('express')
const router = express.Router()
const checkAuth = require('../../middlewares/check-auth')
const flowController = require('../../controllers/industry/flowController')

router.get('/', flowController.getAllFlowData)
router.get('/latest', flowController.getLatestFlowData)
router.post('/add/bulk/apid', flowController.addapiID)

module.exports = router
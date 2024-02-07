const express = require('express')
const router = express.Router()
const sludgeController = require('../../controllers/plant/sludgeController')
const checkAuth = require('../../middlewares/check-auth')

router.get('/', sludgeController.getSludge)
router.post('/create', sludgeController.createSludge)
router.patch('/update', sludgeController.updateSludge)
router.delete('/delete', sludgeController.deleteSludge)

module.exports = router
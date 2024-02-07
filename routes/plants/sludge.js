const express = require('express')
const router = express.Router()
const sludgeController = require('../../controllers/plant/sludgeController')
const checkAuth = require('../../middlewares/check-auth')

router.get('/', checkAuth, sludgeController.getSludge)
router.post('/create', checkAuth, sludgeController.createSludge)
router.patch('/update', checkAuth, sludgeController.updateSludge)
router.delete('/delete', checkAuth, sludgeController.deleteSludge)

module.exports = router
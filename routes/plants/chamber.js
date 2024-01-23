const express = require('express')
const router = express.Router()
const checkAuth = require('../../middlewares/check-auth')
const chamberController = require('../../controllers/plant/chamberController')

router.get('/', chamberController.getChamber)
router.post('/add', chamberController.createChamber)
router.patch('/update', chamberController.updateChamber)
router.patch('/update/position', chamberController.swapChamberPosition)
router.delete('/delete/:chamberID', chamberController.deleteChamber)

module.exports = router
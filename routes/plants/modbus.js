const express = require('express')
const router = express.Router()
const modbusController = require('../../controllers/plant/modbusController')
const checkAuth = require('../../middlewares/check-auth')

router.get('/', checkAuth, modbusController.getAllAddress)
router.get('/report', checkAuth, modbusController.getReport)
router.post('/add', checkAuth, modbusController.addInstrumentsModbusAddress)
router.patch('/update/tagno', checkAuth, modbusController.updateTagNo)
router.delete('/delete/:address', checkAuth, modbusController.deleteAddress)

module.exports = router
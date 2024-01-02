const express = require('express')
const router = express.Router()
const modbusController = require('../../controllers/plant/modbusController')
const checkAuth = require('../../middlewares/check-auth')


router.get('/', modbusController.getAllAddress)

router.get('/report', modbusController.getReport)

router.post('/add', modbusController.addInstrumentsModbusAddress)
router.patch('/update/tagno', modbusController.updateTagNo)
router.delete('/delete/:address', modbusController.deleteAddress)

// router.post('/test', modbusController.reporter)

module.exports = router
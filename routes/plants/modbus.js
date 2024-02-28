const express = require('express')
const router = express.Router()
const modbusController = require('../../controllers/plant/modbusController')
const checkAccess = require('../../middlewares/check-access')
const departmentAccess = {
    read: ['Reports-Read', 'Reports-Write'],
    write: ['Reports-Write']
}

const accessCheck = (isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed) => {
    return (req, res, next) => {
        checkAccess(departmentAccess, req.method, isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed)(req, res, next);
    };
}
router.get('/', accessCheck(), modbusController.getAllAddress)
router.get('/report', accessCheck(), modbusController.getReport)
router.post('/add', accessCheck(), modbusController.addInstrumentsModbusAddress)
router.patch('/update/tagno', accessCheck(), modbusController.updateTagNo)
router.delete('/delete/:address', accessCheck(), modbusController.deleteAddress)

module.exports = router
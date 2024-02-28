const express = require('express')
const router = express.Router()
const instrumentController = require('../../controllers/plant/instrumentController')
const multer = require('multer')
const checkAccess = require('../../middlewares/check-access')
const departmentAccess = {
    read: ['Process-Read', 'Process-Write'],
    write: ['Process-Write']
}

const accessCheck = (isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed) => {
    return (req, res, next) => {
        checkAccess(departmentAccess, req.method, isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed)(req, res, next);
    };
}

// in order for multer to work, make a directory using mkdir -p directroy_path
const excelSheetStorage = multer({
    storage: multer.diskStorage({
        destination: (req,file,cb) => {
            return cb(null, 'uploads/plant/instruments')
        },
        filename: (req,file,cb) => {
            return cb(null, `${Date.now()}-${file.originalname}`)
        }
    })
}).single("instrument_sheet")

router.use('/modbus', require('./modbus'))

router.get('/', accessCheck(), instrumentController.getInstrCategories)
router.get('/filters', accessCheck(), instrumentController.getFilters)
router.post('/add/filters', accessCheck(), instrumentController.addFilters)
router.post('/add/bulk', accessCheck(), excelSheetStorage, instrumentController.bulkAddInstruments)
router.post('/add/modbus', accessCheck(), instrumentController.addInstrumentsModbusAddress)
router.post('/add', accessCheck(), instrumentController.addInstrument)
router.patch('/update', accessCheck(), instrumentController.updateInstrument)
router.delete('/delete/:TagNo', accessCheck(), instrumentController.deleteInstrument)

module.exports = router
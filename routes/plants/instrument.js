const express = require('express')
const router = express.Router()
const instrumentController = require('../../controllers/plant/instrumentController')
const checkAuth = require('../../middlewares/check-auth')
const checkAdmin = require('../../middlewares/check-admin')
const multer = require('multer')

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

router.get('/', checkAuth, instrumentController.getInstrCategories)
router.get('/filters', checkAuth, instrumentController.getFilters)
router.post('/add/filters', checkAuth, checkAdmin, instrumentController.addFilters)
router.post('/add/bulk', checkAuth, checkAdmin, excelSheetStorage, instrumentController.bulkAddInstruments)
router.post('/add/modbus', checkAuth, instrumentController.addInstrumentsModbusAddress)
router.post('/add', checkAuth, instrumentController.addInstrument)
router.patch('/update', checkAuth, instrumentController.updateInstrument)
router.delete('/delete/:TagNo', checkAuth, instrumentController.deleteInstrument)

module.exports = router
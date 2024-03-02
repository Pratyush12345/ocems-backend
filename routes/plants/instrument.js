const express = require('express')
const router = express.Router()
const instrumentController = require('../../controllers/plant/instrumentController')
const multer = require('multer')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: ['Process-Read', 'Process-Write'],
    write: ['Process-Write']
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

const routes = [
    {
        method: 'get',
        path: '/',
        controller: instrumentController.getInstrCategories
    },
    {
        method: 'get',
        path: '/filters',
        controller: instrumentController.getFilters
    },
    {
        method: 'post',
        path: '/add/filters',
        controller: instrumentController.addFilters
    },
    {
        method: 'post',
        path: '/add/bulk',
        middleware: [excelSheetStorage],
        controller: instrumentController.bulkAddInstruments
    },
    {
        method: 'post',
        path: '/add/modbus',
        controller: instrumentController.addInstrumentsModbusAddress
    },
    {
        method: 'post',
        path: '/add',
        controller: instrumentController.addInstrument
    },
    {
        method: 'patch',
        path: '/update',
        controller: instrumentController.updateInstrument
    },
    {
        method: 'delete',
        path: '/delete/:TagNo',
        controller: instrumentController.deleteInstrument
    }

]

module.exports = defineRoutes(router, routes, departmentAccess)
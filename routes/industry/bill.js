const express = require('express')
const router = express.Router()
const billController = require('../../controllers/industry/billController')
const multer = require('multer')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: ['Industry-Read', 'Industry-Write', 'Bill-Read'],
    write: ['Bill-Write']
}

const billRecieptStorage = multer({
    storage: multer.diskStorage({
        destination: (req,file,cb) => {
            console.log('processing');
            return cb(null, 'uploads/industry/bill')
        },
        filename: (req,file,cb) => {
            return cb(null, `${Date.now()}-${file.originalname}`)
        }
    })
}).single("payment_reciept")

router.use('/master', require('./billMaster'))

const routes = [
    {
        method: 'get',
        path: '/get',
        controller: billController.getBills,
        options: {
            isIndustryAccessAllowed: true
        }
    },
    {
        method: 'get',
        path: '/requests',
        controller: billController.getBillApprovalRequests,
    },
    {
        method: 'get',
        path: '/download',
        controller: billController.downloadBill,
        options: {
            isIndustryAccessAllowed: true
        }
    },
    {
        method: 'post',
        path: '/create/:industryid',
        controller: billController.createBill,
    },
    {
        method: 'post',
        path: '/upload/reciept',
        controller: billController.uploadPaymentReciept,
        middleware: [billRecieptStorage],
        options: {
            isIndustryAccessAllowed: true,
            isPlantAccessAllowed: false
        }
    },
    {
        method: 'patch',
        path: '/:decision/:requestid',
        controller: billController.processBill,
    },
    {
        method: 'delete',
        path: '/delete/:industryid/:billid',
        controller: billController.deleteCopy,
    }
]

module.exports = defineRoutes(router, routes, departmentAccess)
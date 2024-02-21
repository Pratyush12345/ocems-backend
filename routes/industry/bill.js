const express = require('express')
const router = express.Router()
const billController = require('../../controllers/industry/billController')
const multer = require('multer')
const checkAuth = require('../../middlewares/check-auth')
const checkIndustry = require('../../middlewares/check-industry')
const extractUser = require('../../middlewares/extract-user')
const checkAccess = require('../../middlewares/check-access')
const departmentAccess = {
    read: ['Industry-Read', 'Industry-Write', 'Bill-Read'],
    write: ['Bill-Write']
}

const billRecieptStorage = multer({
    storage: multer.diskStorage({
        destination: (req,file,cb) => {
            return cb(null, 'uploads/industry/bill')
        },
        filename: (req,file,cb) => {
            return cb(null, `${Date.now()}-${file.originalname}`)
        }
    })
}).single("payment_reciept")

router.use('/master', require('./billMaster'))

router.get('/get', checkAuth, billController.getBills)
router.get('/requests', checkAuth, billController.getBillApprovalRequests)
router.get('/download', checkAuth, extractUser, checkAccess(departmentAccess, 'GET', true), billController.downloadBill)

router.post('/create/:industryid', checkAuth, billController.createBill)
router.post('/upload/reciept', checkAuth, checkIndustry, billRecieptStorage, billController.uploadPaymentReciept)

router.patch('/:decision/:requestid', checkAuth, billController.processBill)

router.delete('/delete/:industryid/:billid', checkAuth, billController.deleteCopy)

module.exports = router
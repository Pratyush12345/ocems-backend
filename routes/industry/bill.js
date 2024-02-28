const express = require('express')
const router = express.Router()
const billController = require('../../controllers/industry/billController')
const multer = require('multer')
const checkAccess = require('../../middlewares/check-access')
const departmentAccess = {
    read: ['Industry-Read', 'Industry-Write', 'Bill-Read'],
    write: ['Bill-Write']
}

const accessCheck = (isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed) => {
    return (req, res, next) => {
        checkAccess(departmentAccess, req.method, isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed)(req, res, next);
    };
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

router.get('/get', accessCheck(true), billController.getBills)
router.get('/requests', accessCheck(), billController.getBillApprovalRequests)
router.get('/download', accessCheck(true), billController.downloadBill)

router.post('/create/:industryid', accessCheck(), billController.createBill)
router.post('/upload/reciept', accessCheck(true,false), billRecieptStorage, billController.uploadPaymentReciept)

router.patch('/:decision/:requestid', accessCheck(), billController.processBill)

router.delete('/delete/:industryid/:billid', accessCheck(), billController.deleteCopy)

module.exports = router
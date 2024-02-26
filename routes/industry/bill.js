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

// TODO: Add check for plant access
const GETAccessCheck = (isIndustryAccessAllowed = false, isPlantAccessAllowed = true) => {
    return (req, res, next) => {
        checkAccess(departmentAccess, 'GET', isIndustryAccessAllowed, isPlantAccessAllowed)(req, res, next);
    };
}

const RESTAccessCheck = (isIndustryAccessAllowed = false, isPlantAccessAllowed = true) => {
    return (req, res, next) => {
        checkAccess(departmentAccess, req.method, isIndustryAccessAllowed, isPlantAccessAllowed)(req, res, next);
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

router.get('/get', checkAuth, extractUser, GETAccessCheck(true), billController.getBills)
router.get('/requests', checkAuth, extractUser, GETAccessCheck(), billController.getBillApprovalRequests)
router.get('/download', checkAuth, extractUser, GETAccessCheck(true), billController.downloadBill)

router.post('/create/:industryid', checkAuth, extractUser, RESTAccessCheck(), billController.createBill)
router.post('/upload/reciept', checkAuth, extractUser, RESTAccessCheck(true), billRecieptStorage, billController.uploadPaymentReciept)

router.patch('/:decision/:requestid', checkAuth, extractUser, RESTAccessCheck(), billController.processBill)

router.delete('/delete/:industryid/:billid', checkAuth, extractUser, RESTAccessCheck(), billController.deleteCopy)

module.exports = router
const express = require('express')
const router = express.Router()
const noticeController = require('../../controllers/industry/noticeController')
const multer = require('multer')
const checkAccess = require('../../middlewares/check-access')
const departmentAccess = {
    read: ['Industry-Read', 'Industry-Write', 'Notices-Read', 'Notices-Write'],
    write: ['Notices-Write']
}

const accessCheck = (isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed) => {
    return (req, res, next) => {
        checkAccess(departmentAccess, req.method, isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed)(req, res, next);
    };
}
const noticeStorage = multer({
    storage: multer.diskStorage({
        destination: (req,file,cb) => {
            return cb(null, 'uploads/industry/notices')
        },
        filename: (req,file,cb) => {
            return cb(null, `${Date.now()}-${file.originalname}`)
        }
    })
}).array("notices")

router.get('/', accessCheck(true), noticeController.getNotices)
router.post('/create', accessCheck(), noticeStorage, noticeController.createNotice)
router.patch('/update/:industryid/:noticeid', accessCheck(), noticeController.updateIsNew)
router.delete('/delete/:noticeid', accessCheck(), noticeController.deleteNotice)

module.exports = router
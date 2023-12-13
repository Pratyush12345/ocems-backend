const express = require('express')
const router = express.Router()
const noticeController = require('../../controllers/industry/noticeController')
const checkAuth = require('../../middlewares/check-auth')
const checkAdmin = require('../../middlewares/check-admin')
const multer = require('multer')

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

router.post('/create/:industryid', checkAuth, checkAdmin, noticeStorage, noticeController.createNotice)
router.patch('/update/:industryid/:noticeid', checkAuth, checkAdmin, noticeController.updateNotice)
router.patch('/update/attachments/:industryid/:noticeid', checkAuth, checkAdmin, noticeStorage, noticeController.updateNoticeAttachments)
router.delete('/delete/:industryid/:noticeid', checkAuth, checkAdmin, noticeController.deleteNotice)

module.exports = router
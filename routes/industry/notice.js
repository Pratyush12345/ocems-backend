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

router.get('/', checkAuth, noticeController.getNotices)
router.post('/create', checkAuth, checkAdmin, noticeStorage, noticeController.createNotice)
router.patch('/update/:industryid/:noticeid', checkAuth, noticeController.updateNotice)
router.delete('/delete/:noticeid', checkAuth, checkAdmin, noticeController.deleteNotice)

module.exports = router
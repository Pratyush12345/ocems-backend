const express = require('express')
const router = express.Router()
const noticeController = require('../../controllers/industry/noticeController')
const multer = require('multer')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: ['Industry-Read', 'Industry-Write', 'Notices-Read', 'Notices-Write'],
    write: ['Notices-Write']
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

const routes = [
    {
        method: 'get',
        path: '/',
        controller: noticeController.getNotices,
        options: {
            isIndustryAccessAllowed: true
        }
    },
    {
        method: 'post',
        path: '/create',
        middleware: [noticeStorage],
        controller: noticeController.createNotice,
    },
    {
        method: 'patch',
        path: '/update/:industryid/:noticeid',
        controller: noticeController.updateIsNew,
    },
    {
        method: 'delete',
        path: '/delete/:noticeid',
        controller: noticeController.deleteNotice,
    }

]

module.exports = defineRoutes(router, routes, departmentAccess)
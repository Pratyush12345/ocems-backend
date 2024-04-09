const express = require('express')
const router = express.Router()
const industryController = require('../../controllers/industry/industryController')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: ['Industry-Read', 'Industry-Write', 'Bill-Read', 'Bill-Write'],
    write: ['Industry-Write']
}
const multer = require('multer')

const bulkUploadSheet = multer({
    storage: multer.diskStorage({
        destination: (req,file,cb) => {
            console.log('processing');
            return cb(null, 'uploads/industry/')
        },
        filename: (req,file,cb) => {
            return cb(null, `${Date.now()}-${file.originalname}`)
        }
    })
}).single("industries_file")

router.use('/bill', require('./bill'))
router.use('/notice', require('./notice'))
router.use('/flow', require('./flow'))

const routes = [
    {
        method: 'get',
        path: '/',
        controller: industryController.getRequests,
        options: {
            isIndustryAccessAllowed: true
        }
    },
    {
        method: 'get',
        path: '/name/:uid',
        controller: industryController.getIndustryName
    },
    {
        method: 'get',
        path: '/requests',
        controller: industryController.getUnapprovedRequests,
    },
    {
        method: 'post',
        path: '/add',
        controller: industryController.addIndustry,
    },
    {
        method: 'post',
        path: '/approve/:uid',
        controller: industryController.approveRequest,
    },
    {
        method: 'post',
        path: '/reject/:uid',
        controller: industryController.rejectRequest,
    },
    {
        method: 'post',
        path: '/bulkadd',
        controller: industryController.bulkUpload,
        middleware: [bulkUploadSheet]
    },
    {
        method: 'patch',
        path: '/update/:industryid',
        controller: industryController.updateIndustry,
        options: {
            isIndustryAccessAllowed: true,
            isPlantAccessAllowed: false
        }
    },
    {
        method: 'delete',
        path: '/delete/:uid',
        controller: industryController.deleteIndustry,
    }
]

module.exports = defineRoutes(router, routes, departmentAccess)
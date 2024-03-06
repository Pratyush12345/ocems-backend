const express = require('express')
const router = express.Router()
const industryController = require('../../controllers/industry/industryController')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: ['Industry-Read', 'Industry-Write'],
    write: ['Industry-Write']
}

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
    },
    {
        method: 'delete',
        path: '/delete/:uid',
        controller: industryController.deleteIndustry,
    }
]

module.exports = defineRoutes(router, routes, departmentAccess)
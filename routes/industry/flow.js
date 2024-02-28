const express = require('express')
const router = express.Router()
const flowController = require('../../controllers/industry/flowController')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: ['Industry-Read', 'Industry-Write'],
    write: ['Industry-Write']
}

const routes = [
    {
        method: 'get',
        path: '/',
        controller: flowController.getAllFlowData,
    },
    {
        method: 'get',
        path: '/latest',
        controller: flowController.getLatestFlowData,
    },
    {
        method: 'post',
        path: '/add/bulk/apid',
        controller: flowController.addapiID,
    }
]

module.exports = defineRoutes(router, routes, departmentAccess)
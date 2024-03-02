const express = require('express')
const router = express.Router()
const alertController = require('../../controllers/plant/alertController')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: ['Process-Read', 'Process-Write'],
    write: ['Process-Write']
}

const routes = [
    {
        method: 'get',
        path: '/',
        controller: alertController.getAlerts,
    },
    {
        method: 'get',
        path: '/count',
        controller: alertController.alertsCount,
    }

]

module.exports = defineRoutes(router, routes, departmentAccess)
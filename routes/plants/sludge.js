const express = require('express')
const router = express.Router()
const sludgeController = require('../../controllers/plant/sludgeController')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: ['Reports-Read', 'Reports-Write'],
    write: ['Reports-Write']
}

const routes = [
    {
        method: 'get',
        path: '/',
        controller: sludgeController.getSludge,
    },
    {
        method: 'post',
        path: '/create',
        controller: sludgeController.createSludge,
    },
    {
        method: 'patch',
        path: '/update',
        controller: sludgeController.updateSludge,
    },
    {
        method: 'delete',
        path: '/delete',
        controller: sludgeController.deleteSludge,
    }
]

module.exports = defineRoutes(router, routes, departmentAccess)
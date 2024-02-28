const express = require('express')
const router = express.Router()
const chamberController = require('../../controllers/plant/chamberController')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: ['Process-Read', 'Process-Write'],
    write: ['Process-Write']
}

const routes = [
    {
        method: 'get',
        path: '/',
        controller: chamberController.getChamber
    },
    {
        method: 'post',
        path: '/add',
        controller: chamberController.createChamber,
    },
    {
        method: 'patch',
        path: '/update',
        controller: chamberController.updateChamber,
    },
    {
        method: 'patch',
        path: '/update/position',
        controller: chamberController.swapChamberPosition,
    },
    {
        method: 'delete',
        path: '/delete/:chamberID',
        controller: chamberController.deleteChamber,
    }

]

module.exports = defineRoutes(router, routes, departmentAccess);
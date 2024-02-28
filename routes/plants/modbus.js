const express = require('express')
const router = express.Router()
const modbusController = require('../../controllers/plant/modbusController')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: ['Reports-Read', 'Reports-Write'],
    write: ['Reports-Write']
}

const routes = [
    {
        method: 'get',
        path: '/',
        controller: modbusController.getAllAddress,
    },
    {
        method: 'get',
        path: '/report',
        controller: modbusController.getReport,
    },
    {
        method: 'post',
        path: '/add',
        controller: modbusController.addInstrumentsModbusAddress,
    },
    {
        method: 'patch',
        path: '/update/tagno',
        controller: modbusController.updateTagNo,
    },
    {
        method: 'delete',
        path: '/delete/:address',
        controller: modbusController.deleteAddress,
    }
]

module.exports = defineRoutes(router, routes, departmentAccess)
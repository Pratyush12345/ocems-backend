const express = require('express')
const router = express.Router()
const billMasterController = require('../../controllers/industry/billMasterController')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: ['Industry-Read', 'Industry-Write', 'Bill-Read', 'Bill-Write'],
    write: ['Bill-Write']
}

const routes = [
    {
        method: 'get',
        path: '/types',
        controller: billMasterController.getMasterCopiesTypes,
    },
    {
        method: 'get',
        path: '/',
        controller: billMasterController.getMasterCopies,
    },
    {
        method: 'post',
        path: '/create',
        controller: billMasterController.createCopy,
    },
    {
        method: 'patch',
        path: '/update',
        controller: billMasterController.updateCopy,
    },
    {
        method: 'delete',
        path: '/delete/:id',
        controller: billMasterController.deleteCopy,
    }
]

module.exports = defineRoutes(router, routes, departmentAccess)
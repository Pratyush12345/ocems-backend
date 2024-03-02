const express = require('express')
const router = express.Router()
const superAdminController = require('../../controllers/users/superAdminController')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: [],
    write: []
}

const routes = [
    {
        method: 'get',
        path: '/',
        controller: superAdminController.getSuperAdmin,
        options: {
            isOnlySuperAdminAccessAllowed: true
        }
    },
    {
        method: 'patch',
        path: '/update',
        controller: superAdminController.updateSuperAdmin,
        options: {
            isOnlySuperAdminAccessAllowed: true
        }
    },
    {
        method: 'delete',
        path: '/delete',
        controller: superAdminController.deleteSuperAdmin,
        options: {
            isOnlySuperAdminAccessAllowed: true
        }
    }
]

module.exports = defineRoutes(router, routes, departmentAccess);
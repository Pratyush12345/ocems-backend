const express = require('express')
const router = express.Router()
const adminController = require('../../controllers/users/adminController')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: [],
    write: []
}

const routes = [
    {
        method: 'get',
        path: '/',
        controller: adminController.getAdmin,
        options: {
            areAllPlantRolesAllowed: true
        }
    },
    {
        method: 'post',
        path: '/signup',
        controller: adminController.signUp,
        options: {
            isOnlySuperAdminAccessAllowed: true
        }
    },
    {
        method: 'patch',
        path: '/update',
        controller: adminController.updateAdmin,
        options: {
            isOnlySuperAdminAccessAllowed: true
        }
    },
    {
        method: 'delete',
        path: '/delete/:adminuid',
        controller: adminController.deleteAdmin,
        options: {
            isOnlySuperAdminAccessAllowed: true
        }
    }

]

module.exports = defineRoutes(router, routes, departmentAccess);
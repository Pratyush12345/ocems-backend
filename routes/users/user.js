const express = require('express')
const router = express.Router()
const userContoller = require('../../controllers/users/userController')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: [],
    write: []
}

const routes = [
    {
        method: 'get',
        path: '/',
        controller: userContoller.getUsers,
        options: { 
            areAllPlantRolesAllowed: true
        }
    },
    {
        method: 'get',
        path: '/:mail',
        controller: userContoller.getUserByMail,
        options: { 
            areAllPlantRolesAllowed: true
        }
    },
    {
        method: 'get',
        path: '/:uid',
        controller: userContoller.getUser,
        options: { 
            areAllPlantRolesAllowed: true
        }
    },
    {
        method: 'patch',
        path: '/update/password',
        controller: userContoller.passwordReset,
    },
    {
        method: 'patch',
        path: '/update/:useruid',
        controller: userContoller.updateUser,
    },
    {
        method: 'delete',
        path: '/delete/:useruid',
        controller: userContoller.deleteUser,
    }
]

module.exports = defineRoutes(router, routes, departmentAccess)
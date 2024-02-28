const express = require('express')
const router = express.Router()
const operatorController = require('../../controllers/users/operatorController')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: [],
    write: []
}

const routes = [
    {
        method: 'post',
        path: '/signup',
        controller: operatorController.signUp
    }
]

module.exports = defineRoutes(router, routes, departmentAccess);
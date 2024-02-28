const express = require('express')
const router = express.Router()
const officerController = require('../../controllers/users/officerController')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: [],
    write: []
}

const routes = [
    {
        method: 'post',
        path: '/signup',
        controller: officerController.signUp
    }
]

module.exports = defineRoutes(router, routes, departmentAccess);
const express = require('express');
const router = express.Router();
const plantDashboardController = require('../../controllers/dashboard/plant')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: [],
    write: []
}

const routes = [
    {
        method: 'get',
        path: '/payments',
        controller: plantDashboardController.paymentsData
    },
    {
        method: "get",
        path: "/industries",
        controller: plantDashboardController.getNumberOfIndustries
    },
    {
        method: "get",
        path: "/industries/requests",
        controller: plantDashboardController.getNumberOfIndustryRequests
    },
    {
        method: "get",
        path: "/industries/requests/bills",
        controller: plantDashboardController.getNumberOfBillApprovalRequests
    },
    
]

module.exports = defineRoutes(router, routes, departmentAccess);
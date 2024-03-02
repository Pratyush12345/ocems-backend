const express = require('express');
const router = express.Router();
const inventoryController = require('../../controllers/inventory/inventoryController')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: ['Inventory-Read', 'Inventory-Write'],
    write: ['Inventory-Write']
}

const routes = [
    {
        method: 'get',
        path: '/',
        controller: inventoryController.getItems
    },
    {
        method: 'post',
        path: '/add',
        controller: inventoryController.addItem,
    },
    {
        method: 'patch',
        path: '/use',
        controller: inventoryController.useItem,
    },
    {
        method: 'patch',
        path: '/update',
        controller: inventoryController.updateItem,
    },
    {
        method: 'patch',
        path: '/restock',
        controller: inventoryController.restockItem,
    },
    {
        method: 'delete',
        path: '/delete/:itemid',
        controller: inventoryController.deleteItem,
    }

]

module.exports = defineRoutes(router, routes, departmentAccess);
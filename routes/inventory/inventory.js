const express = require('express');
const router = express.Router();
const inventoryController = require('../../controllers/inventory/inventoryController')
const checkAccess = require('../../middlewares/check-access')
const departmentAccess = {
    read: ['Inventory-Read', 'Inventory-Write'],
    write: ['Inventory-Write']
}

const accessCheck = (isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed) => {
    return (req, res, next) => {
        checkAccess(departmentAccess, req.method, isIndustryAccessAllowed, isPlantAccessAllowed, isOnlySuperAdminAccessAllowed)(req, res, next);
    };
}

router.get('/', accessCheck(), inventoryController.getItems)

router.post('/add', accessCheck(), inventoryController.addItem)

router.patch('/use', accessCheck(), inventoryController.useItem)
router.patch('/update', accessCheck(), inventoryController.updateItem)
router.patch('/restock', accessCheck(), inventoryController.restockItem)

router.delete('/delete/:itemid', accessCheck(), inventoryController.deleteItem)

module.exports = router;
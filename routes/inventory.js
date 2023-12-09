const express = require('express');
const router = express.Router();
const checkAuth = require('../middlewares/check-auth')
const inventoryController = require('../controllers/inventoryController')

router.get('/', checkAuth, inventoryController.getItems)

router.post('/add', checkAuth, inventoryController.addItem)

router.patch('/use', checkAuth, inventoryController.useItem)
router.patch('/update', checkAuth, inventoryController.updateItem)
router.patch('/restock', checkAuth, inventoryController.restockItem)

router.delete('/delete/:itemid', checkAuth, inventoryController.deleteItem)

module.exports = router;
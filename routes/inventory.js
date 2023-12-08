const express = require('express');
const router = express.Router();
const checkAuth = require('../middlewares/check-auth')
const inventoryController = require('../controllers/inventoryController')



module.exports = router;
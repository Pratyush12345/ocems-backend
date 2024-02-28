const express = require('express');
const router = express.Router();
const industryController = require('../controllers/industry/industryController');
const plantController = require('../controllers/plant/plantController');
const superAdminController = require('../controllers/users/superAdminController');

// INDUSTRY Routes
router.post('/industry/signup', industryController.signUp);

// PLANT Routes
router.get('/plant/', plantController.getPlant)

// USER Routes
router.post('/superadmin/signup', superAdminController.signUp)

module.exports = router;
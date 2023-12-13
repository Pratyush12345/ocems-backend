const express = require('express');
const router = express.Router();

router.use('/user', require('./users/user'))
router.use('/admin', require('./users/admin'))
router.use('/officer', require('./users/officer'))
router.use('/industry', require('./industry/industry'))
router.use('/operator', require('./users/operator'))
router.use('/superadmin', require('./users/superAdmin'))
router.use('/inventory', require('./inventory/inventory'))

module.exports = router;
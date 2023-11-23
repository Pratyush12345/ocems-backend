const express = require('express');
const router = express.Router();

router.use('/admin', require('./admin'))
router.use('/officer', require('./officer'))
router.use('/operator', require('./operator'))
router.use('/superadmin', require('./superAdmin'))

module.exports = router;
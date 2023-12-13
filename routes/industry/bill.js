const express = require('express')
const router = express.Router()
const billController = require('../../controllers/industry/billController')

router.use('/master', require('./billMaster'))

router.post('/create/:industryid', billController.createBill)

module.exports = router
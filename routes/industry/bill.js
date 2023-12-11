const express = require('express')
const router = express.Router()
const noticeController = require('../../controllers/industry/noticeController')

router.use('/master', require('./billMaster'))



module.exports = router
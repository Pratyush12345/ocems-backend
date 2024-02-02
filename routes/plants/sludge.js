const express = require('express')
const router = express.Router()
const sludgeController = require('../../controllers/plant/sludgeController')
const checkAuth = require('../../middlewares/check-auth')



module.exports = router
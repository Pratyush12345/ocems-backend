const express = require('express');
const router = express.Router();


router.get("/", (req, res)=>{
    res.status(200).send("Ocems Server")
})
router.use('/user', require('./user'))
router.use('/admin', require('./admin'))
router.use('/officer', require('./officer'))
router.use('/industry', require('./industry'))
router.use('/operator', require('./operator'))
router.use('/superadmin', require('./superAdmin'))

module.exports = router;
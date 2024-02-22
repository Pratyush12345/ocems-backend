const express = require('express');
const router = express.Router();


router.get("/", (req, res)=>{
    res.status(200).send("Ocems Server")
})
router.use('/user', require('./users/user'))
router.use('/admin', require('./users/admin'))
router.use('/officer', require('./users/officer'))
router.use('/industry', require('./industry/industry'))
router.use('/operator', require('./users/operator'))
router.use('/superadmin', require('./users/superAdmin'))
router.use('/inventory', require('./inventory/inventory'))
router.use('/payments', require('./payments/payment'))
router.use('/plant', require('./plants/plant'))
router.use('/pdf', require('./pdf'))


module.exports = router;
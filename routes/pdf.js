const express = require('express');
const router = express.Router();
const pdfGenerator = require('../controllers/pdfGenerator');
const checkUser = require('../middlewares/extract-user');


router.post('/test', pdfGenerator.testPdf)

module.exports = router;
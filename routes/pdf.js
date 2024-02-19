const express = require('express');
const router = express.Router();
const pdfGenerator = require('../controllers/pdfGenerator');

router.post('/test', pdfGenerator.testPdf)

module.exports = router;
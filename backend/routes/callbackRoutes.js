const express = require('express');
const { createCallback } = require('../controllers/callbackController');

const router = express.Router();

router.post('/callbacks', createCallback);

module.exports = router;


const express = require('express');
const { handleRetellWebhook } = require('../controllers/retellWebhookController');

const router = express.Router();

// Retell AI webhook endpoint
// Configure Retell to POST all call events here.
router.post('/retell-events', express.json(), handleRetellWebhook);

module.exports = router;


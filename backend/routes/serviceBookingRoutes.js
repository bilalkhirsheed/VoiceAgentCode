const express = require('express');
const { checkAvailability, bookService } = require('../controllers/serviceBookingController');

const router = express.Router();

router.post('/service-booking/check-availability', checkAvailability);
router.post('/service-booking/book', bookService);

module.exports = router;

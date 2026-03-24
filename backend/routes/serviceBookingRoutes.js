const express = require('express');
const { checkAvailability, bookService, checkAndBook } = require('../controllers/serviceBookingController');

const router = express.Router();

router.post('/service-booking/check-availability', checkAvailability);
router.post('/service-booking/book', bookService);
router.post('/service-booking/check-and-book', checkAndBook);

module.exports = router;

const express = require('express');
const { getCalendarEvents } = require('../controllers/calendarEventsController');
const { syncServiceAppointmentsFromCalendar } = require('../controllers/serviceAppointmentsSyncController');

const router = express.Router();

router.get('/calendar-events', getCalendarEvents);
router.post('/service-appointments/sync', syncServiceAppointmentsFromCalendar);

module.exports = router;


const supabase = require('../config/supabaseClient');
const { dealer, department, departmentHours, holiday, serviceAppointment } = require('../models');
const calendarService = require('../services/calendarService');
const { DateTime } = require('luxon');

const SLOT_DURATION_MINUTES = 60;

// Reuse dealer config builder from dealerController
async function buildDealerConfig(dealerId) {
  const dealerTable = dealer.tableName;
  const dealerCols = dealer.columns;
  const { data: dealerRow, error: dealerError } = await supabase
    .from(dealerTable)
    .select('*')
    .eq(dealerCols.id, dealerId)
    .single();
  if (dealerError || !dealerRow) return null;

  const deptTable = department.tableName;
  const deptCols = department.columns;
  const { data: departmentsRows, error: deptError } = await supabase
    .from(deptTable)
    .select('*')
    .eq(deptCols.dealer_id, dealerId);
  if (deptError) return null;

  const dhTable = departmentHours.tableName;
  const dhCols = departmentHours.columns;
  const departmentIds = (departmentsRows || []).map((d) => d[deptCols.id]);
  let hoursRows = [];
  if (departmentIds.length > 0) {
    const { data } = await supabase
      .from(dhTable)
      .select('*')
      .in(dhCols.department_id, departmentIds);
    hoursRows = data || [];
  }

  const hoursByDepartment = hoursRows.reduce((acc, row) => {
    const deptId = row[dhCols.department_id];
    if (!acc[deptId]) acc[deptId] = [];
    acc[deptId].push({
      day: row[dhCols.day_of_week],
      open: row[dhCols.open_time],
      close: row[dhCols.close_time],
      is_closed: row[dhCols.is_closed]
    });
    return acc;
  }, {});

  const departmentsConfig = (departmentsRows || []).map((dept) => ({
    id: dept[deptCols.id],
    name: dept[deptCols.department_name],
    hours: hoursByDepartment[dept[deptCols.id]] || []
  }));

  return {
    dealer_id: dealerRow[dealerCols.id],
    dealer_name: dealerRow[dealerCols.dealer_name],
    timezone: dealerRow[dealerCols.timezone] || 'Asia/Karachi',
    departments: departmentsConfig
  };
}

async function findDealerByPrimaryPhone(primaryPhone) {
  const dealerTable = dealer.tableName;
  const dealerCols = dealer.columns;
  const raw = (primaryPhone || '').trim();
  if (!raw) return null;

  const variants = [raw, raw.startsWith('+') ? raw : `+${raw}`, raw.replace(/^\+/, '')];
  let dealerRow = null;

  for (const phone of [...new Set(variants)]) {
    const { data, error } = await supabase
      .from(dealerTable)
      .select('*')
      .eq(dealerCols.primary_phone, phone)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      dealerRow = data;
      break;
    }
  }

  return dealerRow;
}

function getServiceDepartment(config) {
  const departments = config?.departments || [];
  const service = departments.find((d) => (d.name || '').toLowerCase() === 'service');
  return service || departments[0];
}

/** Parse preferred_time to HH:mm (24h). Accepts "14:00", "2:00 PM", "2:30 PM" */
function parseTimeToHHMM(preferredTime) {
  if (!preferredTime || typeof preferredTime !== 'string') return null;
  const s = preferredTime.trim();
  const match24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const match12 = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const ampm = (match12[3] || '').toLowerCase();
    if (ampm === 'pm' && h !== 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return null;
}

/** Parse preferred_date to YYYY-MM-DD */
function parseDateToYYYYMMDD(preferredDate) {
  if (!preferredDate || typeof preferredDate !== 'string') return null;
  const s = preferredDate.trim();
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return s;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return null;
}

/** Get weekday long name (e.g. Monday) for a date in given timezone */
function getWeekdayInTimezone(dateStr, timeZone) {
  const dt = DateTime.fromISO(dateStr, { zone: timeZone });
  return dt.toFormat('cccc'); // Monday, Tuesday, ...
}

/** Get start/end Date (UTC) for slot: dateStr YYYY-MM-DD, timeHHMM "14:00", timeZone, durationMinutes */
function getSlotBoundsUTC(dateStr, timeHHMM, timeZone, durationMinutes = 60) {
  const [h, m] = timeHHMM.split(':').map(Number);
  const dt = DateTime.fromISO(`${dateStr}T${timeHHMM}:00`, { zone: timeZone });
  const startUTC = dt.toUTC();
  const endUTC = startUTC.plus({ minutes: durationMinutes });
  return { startUTC: startUTC.toJSDate(), endUTC: endUTC.toJSDate() };
}

function hhmmToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [hh, mm] = hhmm.split(':').map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

/** Check if preferred_time is within open_time and close_time (handles same-day only) */
function isWithinWorkingHours(openTime, closeTime, preferredTimeHHMM) {
  const openM = hhmmToMinutes(openTime);
  const closeM = hhmmToMinutes(closeTime);
  const prefM = hhmmToMinutes(preferredTimeHHMM);
  if (openM == null || closeM == null || prefM == null) return false;
  return prefM >= openM && prefM < closeM;
}

function getCalendarId(dealerId, bodyCalendarId) {
  if (bodyCalendarId && typeof bodyCalendarId === 'string') return bodyCalendarId;
  // Hard-coded default calendar for bookings (per client request)
  return 'bilalsonofkhirsheed@gmail.com';
}

async function findAvailableSlotsForDate({
  dealerId,
  dateStr,
  timeZone,
  serviceDept,
  preferredTimeHHMM,
  calendarId,
  maxSlots = 5
}) {
  const weekday = getWeekdayInTimezone(dateStr, timeZone);
  const dayHours = serviceDept.hours.find((h) => (h.day || '').toLowerCase() === weekday.toLowerCase());

  if (!dayHours || dayHours.is_closed) return [];

  const openM = hhmmToMinutes(dayHours.open);
  const closeM = hhmmToMinutes(dayHours.close);
  const preferredM = hhmmToMinutes(preferredTimeHHMM);

  if (openM == null || closeM == null) return [];

  // Only suggest slots from (preferred time) forward, within working hours
  const startM = preferredM != null && preferredM > openM ? preferredM : openM;

  const slots = [];
  const step = SLOT_DURATION_MINUTES;

  for (let m = startM; m + step <= closeM && slots.length < maxSlots; m += step) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    const candidateHHMM = `${hh}:${mm}`;

    const { startUTC, endUTC } = getSlotBoundsUTC(dateStr, candidateHHMM, timeZone, SLOT_DURATION_MINUTES);
    // eslint-disable-next-line no-await-in-loop
    const busy = await calendarService.isSlotBusy(calendarId, startUTC, endUTC);
    if (!busy) {
      const displayTime = DateTime.fromISO(`${dateStr}T${candidateHHMM}:00`, { zone: timeZone }).toFormat('h:mm a');
      slots.push({
        date: dateStr,
        time: candidateHHMM,
        display_time: displayTime
      });
    }
  }

  return slots;
}

// --- Check availability ---
async function checkAvailability(req, res) {
  try {
    const { dealer_phone, preferred_date, preferred_time, calendar_id } = req.body;
    if (!dealer_phone || !preferred_date || !preferred_time) {
      return res.status(400).json({
        available: false,
        message: 'Please provide dealer_phone, preferred_date, and preferred_time.',
        reason: 'missing_params'
      });
    }

    const dateStr = parseDateToYYYYMMDD(preferred_date);
    const timeHHMM = parseTimeToHHMM(preferred_time);
    if (!dateStr || !timeHHMM) {
      return res.status(400).json({
        available: false,
        message: 'Please provide a valid date (YYYY-MM-DD) and time (e.g. 14:00 or 2:00 PM).',
        reason: 'invalid_format'
      });
    }

    const dealerRow = await findDealerByPrimaryPhone(dealer_phone);
    const dealerCols = dealer.columns;

    if (!dealerRow) {
      return res.status(404).json({
        available: false,
        message: 'Dealer not found for this phone number.',
        reason: 'dealer_not_found'
      });
    }

    const dealerId = dealerRow[dealerCols.id];

    const config = await buildDealerConfig(dealerId);
    if (!config) {
      return res.status(404).json({
        available: false,
        message: 'Dealer not found.',
        reason: 'dealer_not_found'
      });
    }

    const timeZone = config.timezone || 'Asia/Karachi';
    const serviceDept = getServiceDepartment(config);
    if (!serviceDept || !serviceDept.hours || serviceDept.hours.length === 0) {
      return res.status(400).json({
        available: false,
        message: 'Service department or working hours are not set for this dealer.',
        reason: 'no_hours'
      });
    }

    const weekday = getWeekdayInTimezone(dateStr, timeZone);
    const dayHours = serviceDept.hours.find((h) => (h.day || '').toLowerCase() === weekday.toLowerCase());

    // 1) Holiday check
    const holidayTable = holiday.tableName;
    const holidayCols = holiday.columns;
    const { data: holidayRow } = await supabase
      .from(holidayTable)
      .select('*')
      .eq(holidayCols.dealer_id, dealerId)
      .eq(holidayCols.holiday_date, dateStr)
      .maybeSingle();

    if (holidayRow && holidayRow[holidayCols.is_closed]) {
      const desc = holidayRow[holidayCols.description] || dateStr;
      return res.status(200).json({
        available: false,
        message: `We are closed on that day. ${desc}. Please choose another date.`,
        reason: 'holiday',
        speakable: `We're closed on that day. Please choose another date.`
      });
    }

    // 2) Sunday / closed day
    if (!dayHours || dayHours.is_closed) {
      return res.status(200).json({
        available: false,
        message: `We are closed on ${weekday}s. Please choose another day.`,
        reason: 'closed_day',
        speakable: `We're closed on ${weekday}s. Please choose another day.`
      });
    }

    // 3) Within working hours
    const calendarId = getCalendarId(dealerId, calendar_id);

    if (!isWithinWorkingHours(dayHours.open, dayHours.close, timeHHMM)) {
      let availableSlots = [];
      try {
        availableSlots = await findAvailableSlotsForDate({
          dealerId,
          dateStr,
          timeZone,
          serviceDept,
          preferredTimeHHMM: dayHours.open, // suggest from opening time
          calendarId
        });
      } catch (e) {
        console.error('Error computing alternative slots (outside hours):', e);
      }

      return res.status(200).json({
        available: false,
        message: `Service is not available at that time. Our service hours on ${weekday} are ${dayHours.open} to ${dayHours.close}.`,
        reason: 'outside_working_hours',
        speakable: `Service is not available at that time. We're open from ${dayHours.open} to ${dayHours.close} on ${weekday}s.`,
        available_slots: availableSlots
      });
    }

    // 4) Calendar conflict
    const { startUTC, endUTC } = getSlotBoundsUTC(dateStr, timeHHMM, timeZone, SLOT_DURATION_MINUTES);
    let busy = false;
    try {
      busy = await calendarService.isSlotBusy(calendarId, startUTC, endUTC);
    } catch (err) {
      console.error('Calendar check error:', err);
      return res.status(500).json({
        available: false,
        message: 'Unable to check calendar availability. Please try again later.',
        reason: 'calendar_error'
      });
    }

    if (busy) {
      let availableSlots = [];
      try {
        availableSlots = await findAvailableSlotsForDate({
          dealerId,
          dateStr,
          timeZone,
          serviceDept,
          preferredTimeHHMM: timeHHMM,
          calendarId
        });
      } catch (e) {
        console.error('Error computing alternative slots (busy slot):', e);
      }

      return res.status(200).json({
        available: false,
        message: 'This time slot is already booked. Please choose another time.',
        reason: 'already_booked',
        speakable: 'Sorry, that time is already booked. Would you like a different time?',
        available_slots: availableSlots
      });
    }

    // Available
    const displayTime = DateTime.fromISO(`${dateStr}T${timeHHMM}:00`, { zone: timeZone }).toFormat('h:mm a');
    return res.status(200).json({
      available: true,
      message: `Yes, service is available on ${dateStr} at ${displayTime}. Would you like me to book it?`,
      reason: 'available',
      speakable: `Yes, we have availability at ${displayTime} on that day. Shall I book it for you?`,
      slot: {
        date: dateStr,
        time: timeHHMM,
        display_time: displayTime
      }
    });
  } catch (err) {
    console.error('checkAvailability error:', err);
    res.status(500).json({
      available: false,
      message: 'Something went wrong. Please try again.',
      reason: 'error'
    });
  }
}

// --- Book service ---
async function bookService(req, res) {
  try {
    const { dealer_phone, preferred_date, preferred_time, customer_name, customer_phone, calendar_id, notes } = req.body;
    if (!dealer_phone || !preferred_date || !preferred_time) {
      return res.status(400).json({
        success: false,
        message: 'Please provide dealer_phone, preferred_date, and preferred_time.',
        speakable: "I need the date and time to complete the booking."
      });
    }

    const dateStr = parseDateToYYYYMMDD(preferred_date);
    const timeHHMM = parseTimeToHHMM(preferred_time);
    if (!dateStr || !timeHHMM) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date or time format.',
        speakable: "Please provide a valid date and time."
      });
    }

    const dealerRow = await findDealerByPrimaryPhone(dealer_phone);
    const dealerCols = dealer.columns;

    if (!dealerRow) {
      return res.status(404).json({
        success: false,
        message: 'Dealer not found for this phone number.',
        speakable: "I couldn't find that dealership."
      });
    }

    const dealerId = dealerRow[dealerCols.id];

    const config = await buildDealerConfig(dealerId);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Dealer not found.',
        speakable: "I couldn't find that dealership."
      });
    }

    const timeZone = config.timezone || 'Asia/Karachi';
    const serviceDept = getServiceDepartment(config);
    if (!serviceDept || !serviceDept.hours || serviceDept.hours.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Service hours not configured.',
        speakable: "Service booking is not set up for this dealer."
      });
    }

    const weekday = getWeekdayInTimezone(dateStr, timeZone);
    const dayHours = serviceDept.hours.find((h) => (h.day || '').toLowerCase() === weekday.toLowerCase());

    const holidayTable = holiday.tableName;
    const holidayCols = holiday.columns;
    const { data: holidayRow } = await supabase
      .from(holidayTable)
      .select('*')
      .eq(holidayCols.dealer_id, dealerId)
      .eq(holidayCols.holiday_date, dateStr)
      .maybeSingle();

    if (holidayRow && holidayRow[holidayCols.is_closed]) {
      return res.status(400).json({
        success: false,
        message: 'We are closed on that day.',
        speakable: "We're closed on that day. Please choose another date."
      });
    }

    if (!dayHours || dayHours.is_closed) {
      return res.status(400).json({
        success: false,
        message: `We are closed on ${weekday}s.`,
        speakable: `We're closed on ${weekday}s. Please choose another day.`
      });
    }

    if (!isWithinWorkingHours(dayHours.open, dayHours.close, timeHHMM)) {
      return res.status(400).json({
        success: false,
        message: 'That time is outside our service hours.',
        speakable: "That time is outside our service hours. We're open from " + dayHours.open + " to " + dayHours.close + " on " + weekday + "s."
      });
    }

    const calendarId = getCalendarId(dealerId, calendar_id);
    const { startUTC, endUTC } = getSlotBoundsUTC(dateStr, timeHHMM, timeZone, SLOT_DURATION_MINUTES);
    let busy = false;
    try {
      busy = await calendarService.isSlotBusy(calendarId, startUTC, endUTC);
    } catch (err) {
      console.error('Calendar check error:', err);
      return res.status(500).json({
        success: false,
        message: 'Unable to check calendar.',
        speakable: "I couldn't check our calendar. Please try again in a moment."
      });
    }

    if (busy) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is already booked.',
        speakable: "Sorry, that slot was just taken. Would you like another time?"
      });
    }

    const summary = `service_request${customer_name ? ` - ${customer_name}` : ''}`;
    const description = [customer_phone && `Phone: ${customer_phone}`, notes].filter(Boolean).join('\n');
    let result;
    try {
      result = await calendarService.createEvent(calendarId, startUTC, endUTC, summary, description, timeZone);
    } catch (err) {
      console.error('Calendar create error:', err);
      return res.status(500).json({
        success: false,
        message: 'Booking could not be completed. Please try again.',
        speakable: "I wasn't able to complete the booking. Please try again or call us directly."
      });
    }

    const displayTime = DateTime.fromISO(`${dateStr}T${timeHHMM}:00`, { zone: timeZone }).toFormat('h:mm a');
    const displayDate = DateTime.fromISO(dateStr, { zone: timeZone }).toFormat('cccc, MMM d');

    // Persist into service_appointments for CRM
    try {
      const saTable = serviceAppointment.tableName;
      const saCols = serviceAppointment.columns;
      const startLocal = DateTime.fromISO(`${dateStr}T${timeHHMM}:00`, { zone: timeZone });
      const endLocal = startLocal.plus({ minutes: SLOT_DURATION_MINUTES });

      const insertPayload = {
        [saCols.dealer_id]: null,
        [saCols.dealer_phone]: dealer_phone,
        [saCols.dealer_name]: dealerRow[dealerCols.dealer_name],
        [saCols.customer_name]: customer_name || null,
        [saCols.customer_phone]: customer_phone || null,
        [saCols.customer_email]: null,
        [saCols.vehicle_make]: null,
        [saCols.vehicle_model]: null,
        [saCols.vehicle_year]: null,
        [saCols.service_request]: notes || null,
        [saCols.start_time_utc]: startUTC.toISOString(),
        [saCols.end_time_utc]: endUTC.toISOString(),
        [saCols.start_time_local]: startLocal.toISO(),
        [saCols.end_time_local]: endLocal.toISO(),
        [saCols.local_timezone]: timeZone,
        [saCols.preferred_date]: dateStr,
        [saCols.preferred_time]: timeHHMM,
        [saCols.calendar_event_id]: result.eventId,
        [saCols.calendar_html_link]: result.htmlLink || null
      };

      // Fire-and-forget insert; if it fails we still keep booking
      // eslint-disable-next-line no-unused-vars
      const { error: saError } = await supabase.from(saTable).insert([insertPayload]);
      if (saError) {
        console.error('Failed to insert service_appointments row:', saError);
      }
    } catch (e) {
      console.error('Unexpected error inserting service_appointments:', e);
    }

    return res.status(201).json({
      success: true,
      message: `Your service appointment is confirmed for ${displayDate} at ${displayTime}.`,
      speakable: `Done. Your service is booked for ${displayDate} at ${displayTime}. We'll see you then.`,
      event_id: result.eventId,
      slot: {
        date: dateStr,
        time: timeHHMM,
        display_date: displayDate,
        display_time: displayTime
      }
    });
  } catch (err) {
    console.error('bookService error:', err);
    res.status(500).json({
      success: false,
      message: 'Something went wrong.',
      speakable: "Something went wrong. Please try again."
    });
  }
}

module.exports = {
  checkAvailability,
  bookService
};

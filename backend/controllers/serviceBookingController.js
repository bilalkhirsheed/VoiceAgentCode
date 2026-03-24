const supabase = require('../config/supabaseClient');
const { dealer, department, departmentHours, holiday, serviceAppointment } = require('../models');
const calendarService = require('../services/calendarService');
const emailService = require('../services/emailService');
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

/** Resolve dealer by primary_phone, or by Retell inbound number (so Book_the_Service works when agent sends the DID). */
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
      .limit(1)
      .maybeSingle();

    if (error) {
      // If the phone matches multiple rows (or none), do not hard-fail.
      // We just try next variant; the caller will handle "dealer not found".
      console.warn('[serviceBookingController] findDealerByPrimaryPhone error', {
        phone,
        error: error.message || String(error)
      });
      continue;
    }
    if (data) {
      dealerRow = data;
      break;
    }
  }

  // If caller provided a department transfer phone (e.g. service_transfer_phone),
  // resolve the dealer using departments.transfer_phone.
  if (!dealerRow) {
    const deptTable = department.tableName;
    const deptCols = department.columns;
    for (const phone of [...new Set(variants)]) {
      const { data: deptMatch, error } = await supabase
        .from(deptTable)
        .select(deptCols.dealer_id)
        .eq(deptCols.transfer_phone, phone)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[serviceBookingController] findDealerByPrimaryPhone dept lookup error', {
          phone,
          error: error.message || String(error)
        });
        continue;
      }
      if (deptMatch && deptMatch[deptCols.dealer_id] != null) {
        const dealerId = deptMatch[deptCols.dealer_id];
        const { data: dealerByDept, error: dealerErr } = await supabase
          .from(dealerTable)
          .select('*')
          .eq(dealerCols.id, dealerId)
          .limit(1)
          .maybeSingle();
        if (dealerErr) {
          console.warn('[serviceBookingController] findDealerByPrimaryPhone dealerByDept error', {
            dealerId,
            error: dealerErr.message || String(dealerErr)
          });
          continue;
        }
        if (dealerByDept) dealerRow = dealerByDept;
        break;
      }
    }
  }

  // When customer calls the Retell number, the agent may send that number as dealer_phone; map to dealer
  if (!dealerRow && process.env.RETELL_INBOUND_NUMBER && process.env.RETELL_INBOUND_DEALER_ID) {
    const inbound = (process.env.RETELL_INBOUND_NUMBER || '').trim();
    const inboundVariants = [inbound, inbound.startsWith('+') ? inbound : `+${inbound}`, inbound.replace(/^\+/, '')];
    if (inboundVariants.some((v) => variants.includes(v))) {
      const dealerId = process.env.RETELL_INBOUND_DEALER_ID.trim();
      const { data, error } = await supabase.from(dealerTable).select('*').eq(dealerCols.id, dealerId).maybeSingle();
      if (!error && data) dealerRow = data;
    }
  }

  return dealerRow;
}

function getServiceDepartment(config) {
  const departments = config?.departments || [];
  const service = departments.find((d) => (d.name || '').toLowerCase() === 'service');
  return service || departments[0];
}

async function getDepartmentContactEmail(dealerId, deptKey) {
  if (!dealerId || !deptKey) return null;
  const deptTable = department.tableName;
  const deptCols = department.columns;
  const key = String(deptKey).toLowerCase().trim();
  const pattern = `%${key}%`;

  // Prefer exact dealer + department match with a non-empty contact email.
  const { data: rows, error } = await supabase
    .from(deptTable)
    .select(`${deptCols.department_name}, ${deptCols.contact_email}`)
    .eq(deptCols.dealer_id, dealerId)
    .ilike(deptCols.department_name, pattern);

  if (error) {
    console.warn('[serviceBookingController] getDepartmentContactEmail lookup error', {
      dealerId,
      deptKey: key,
      error: error.message || String(error)
    });
    return null;
  }

  const preferred = (rows || []).find((r) => {
    const email = r?.[deptCols.contact_email];
    return typeof email === 'string' && email.trim().length > 0;
  });

  if (!preferred) return null;
  return preferred[deptCols.contact_email].trim();
}

/**
 * Get request body for Retell custom functions: Retell may send { args: { ... } } or plain { ... }.
 */
function getBody(req) {
  const b = req.body || {};
  if (b.args && typeof b.args === 'object') return b.args;
  return b;
}

/** Normalize Pakistani phone: 03137633702 -> +923137633702 so it matches DB. */
function normalizeDealerPhone(phone) {
  if (!phone || typeof phone !== 'string') return phone;
  const raw = phone.replace(/\D/g, '');
  if (raw.length === 11 && raw.startsWith('0')) return '+92' + raw.slice(1);
  if (raw.length === 10 && raw.startsWith('3')) return '+92' + raw;
  return phone.trim();
}

/** Parse preferred_time to HH:mm (24h). Accepts "14:00", "2:00 PM", "11 AM", "11:30 AM" */
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
  // "11 AM", "11 PM", "2 pm" (no minutes — assume :00)
  const match12NoMin = s.match(/^(\d{1,2})\s*(am|pm)$/i);
  if (match12NoMin) {
    let h = parseInt(match12NoMin[1], 10);
    const ampm = (match12NoMin[2] || '').toLowerCase();
    if (ampm === 'pm' && h !== 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`;
  }
  return null;
}

/** Parse preferred_date to YYYY-MM-DD. Accepts "2026-03-16", "March 16 2026", "March 16th", "16 March" */
function parseDateToYYYYMMDD(preferredDate) {
  if (!preferredDate || typeof preferredDate !== 'string') return null;
  const s = preferredDate.trim();
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    // If explicit year is provided but the date is in the past, move it to next year.
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    const today = new Date();
    const startOfTodayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    let year = y;
    let candidateUTC = Date.UTC(year, m - 1, d, 0, 0, 0);
    while (candidateUTC < startOfTodayUTC) {
      year += 1;
      candidateUTC = Date.UTC(year, m - 1, d, 0, 0, 0);
    }
    if (year !== y) {
      return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return s;
  }

  // Use backend runtime year (so "next year" works automatically).
  // You can override with SERVICE_DEFAULT_YEAR if needed.
  const assumedYear = parseInt(
    process.env.SERVICE_DEFAULT_YEAR || String(new Date().getFullYear()),
    10
  );
  const hasExplicitYear = /\b\d{4}\b/.test(s);

  // If caller didn't specify a year, always assume the current runtime year,
  // and if that date is already in the past, move it to next year.
  if (!hasExplicitYear) {
    const noYear = s.replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim();
    const candidate = new Date(`${noYear} ${assumedYear}`);
    if (!Number.isNaN(candidate.getTime())) {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (candidate < startOfToday) {
        const moved = new Date(`${noYear} ${assumedYear + 1}`);
        if (!Number.isNaN(moved.getTime())) {
          const y = moved.getFullYear();
          const m = String(moved.getMonth() + 1).padStart(2, '0');
          const day = String(moved.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        }
      }
      const y = candidate.getFullYear();
      const m = String(candidate.getMonth() + 1).padStart(2, '0');
      const day = String(candidate.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return null;
  }

  // If caller provided a year, let Date parse it.
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
    const body = getBody(req);
    let { dealer_phone, preferred_date, preferred_time, calendar_id } = body;
    dealer_phone = normalizeDealerPhone(dealer_phone) || dealer_phone;
    if (!dealer_phone || !preferred_date || !preferred_time) {
      return res.status(400).json({
        available: false,
        message: 'Please provide dealer_phone, preferred_date, and preferred_time.',
        reason: 'missing_params'
      });
    }

    console.log('checkAvailability raw body:', body);
    const dateStr = parseDateToYYYYMMDD(preferred_date);
    const timeHHMM = parseTimeToHHMM(preferred_time);
    console.log('checkAvailability parsed:', { preferred_date, preferred_time, dateStr, timeHHMM });
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
    const body = getBody(req);
    // Avoid duplicate notifications in Retell call flows:
    // canonical post-call notification is sent from retellWebhookController (call_analyzed).
    // Enable service-booking endpoint notifications only when explicitly requested.
    const shouldSendBookingEmails =
      String(body.send_notifications || '').toLowerCase() === 'true' ||
      String(process.env.SERVICE_BOOKING_SEND_EMAILS || '').toLowerCase() === 'true';
    let {
      dealer_phone,
      preferred_date,
      preferred_time,
      customer_name,
      customer_phone,
      customer_email,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      calendar_id,
      notes
    } = body;
    dealer_phone = normalizeDealerPhone(dealer_phone) || dealer_phone;
    customer_email = (customer_email && String(customer_email).trim()) || null;
    vehicle_make = (vehicle_make && String(vehicle_make).trim()) || null;
    vehicle_model = (vehicle_model && String(vehicle_model).trim()) || null;
    vehicle_year = (vehicle_year != null && String(vehicle_year).trim() !== '') ? String(vehicle_year).trim() : null;
    if (!dealer_phone || !preferred_date || !preferred_time) {
      return res.status(400).json({
        success: false,
        message: 'Please provide dealer_phone, preferred_date, and preferred_time.',
        speakable: "I need the date and time to complete the booking."
      });
    }

    console.log('bookService raw body:', body);
    const dateStr = parseDateToYYYYMMDD(preferred_date);
    const timeHHMM = parseTimeToHHMM(preferred_time);
    console.log('bookService parsed:', { preferred_date, preferred_time, dateStr, timeHHMM });
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
    // Do not say the year (caller didn't provide it; current year is assumed).
    const displayDate = DateTime.fromISO(dateStr, { zone: timeZone }).toFormat('cccc, MMM d');

    // Persist into service_appointments for CRM
    try {
      const saTable = serviceAppointment.tableName;
      const saCols = serviceAppointment.columns;
      const startLocal = DateTime.fromISO(`${dateStr}T${timeHHMM}:00`, { zone: timeZone });
      const endLocal = startLocal.plus({ minutes: SLOT_DURATION_MINUTES });

      const insertPayload = {
        [saCols.dealer_id]: dealerRow[dealerCols.id] != null ? String(dealerRow[dealerCols.id]) : null,
        [saCols.dealer_phone]: dealer_phone,
        [saCols.dealer_name]: dealerRow[dealerCols.dealer_name],
        [saCols.customer_name]: customer_name || null,
        [saCols.customer_phone]: customer_phone || null,
        [saCols.customer_email]: customer_email || null,
        [saCols.vehicle_make]: vehicle_make || null,
        [saCols.vehicle_model]: vehicle_model || null,
        [saCols.vehicle_year]: vehicle_year || null,
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

      // Notify customer and dealer by email (fire-and-forget)
      const serviceDeptEmail = await getDepartmentContactEmail(dealerRow[dealerCols.id], 'service');
      const dealerEmail = dealerRow[dealerCols.contact_email] || null;
      const recipientEmail = serviceDeptEmail || dealerEmail;
      if (shouldSendBookingEmails && (customer_email || recipientEmail)) {
        emailService
          .notifyRequestReceived({
            dealerName: dealerRow[dealerCols.dealer_name],
            dealerEmail: recipientEmail,
            customerName: customer_name || null,
            customerEmail: customer_email || null,
            customerPhone: customer_phone || null,
            summary: notes || null,
            isServiceBooking: true,
            requestType: 'service',
            appointmentDate: displayDate,
            appointmentTime: displayTime,
            vehicleMake: vehicle_make || null,
            vehicleModel: vehicle_model || null,
            vehicleYear: vehicle_year || null
          })
          .catch((err) => console.error('[Email] notifyRequestReceived error:', err));
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

// --- Check and book in one call (streamlined for voice agent) ---
async function checkAndBook(req, res) {
  try {
    const body = getBody(req);
    // Avoid duplicate notifications in Retell call flows:
    // canonical post-call notification is sent from retellWebhookController (call_analyzed).
    // Enable service-booking endpoint notifications only when explicitly requested.
    const shouldSendBookingEmails =
      String(body.send_notifications || '').toLowerCase() === 'true' ||
      String(process.env.SERVICE_BOOKING_SEND_EMAILS || '').toLowerCase() === 'true';
    let {
      dealer_phone,
      preferred_date,
      preferred_time,
      customer_name,
      customer_phone,
      customer_email,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      calendar_id,
      notes
    } = body;
    dealer_phone = normalizeDealerPhone(dealer_phone) || dealer_phone;
    customer_email = (customer_email && String(customer_email).trim()) || null;
    vehicle_make = (vehicle_make && String(vehicle_make).trim()) || null;
    vehicle_model = (vehicle_model && String(vehicle_model).trim()) || null;
    vehicle_year = (vehicle_year != null && String(vehicle_year).trim() !== '') ? String(vehicle_year).trim() : null;

    if (!dealer_phone || !preferred_date || !preferred_time) {
      return res.status(400).json({
        success: false,
        booked: false,
        available: false,
        message: 'Please provide dealer_phone, preferred_date, and preferred_time.',
        speakable: "I need the date and time to check and book. Could you tell me when you'd like to come in?"
      });
    }

    const dateStr = parseDateToYYYYMMDD(preferred_date);
    const timeHHMM = parseTimeToHHMM(preferred_time);
    if (!dateStr || !timeHHMM) {
      return res.status(400).json({
        success: false,
        booked: false,
        available: false,
        message: 'Invalid date or time format.',
        speakable: "I didn't get a valid date or time. For example, say March 16th at 11 AM."
      });
    }

    const dealerRow = await findDealerByPrimaryPhone(dealer_phone);
    const dealerCols = dealer.columns;
    if (!dealerRow) {
      return res.status(404).json({
        success: false,
        booked: false,
        available: false,
        message: 'Dealer not found.',
        speakable: "I couldn't find that dealership. Please call the number you have for us."
      });
    }

    const dealerId = dealerRow[dealerCols.id];
    const config = await buildDealerConfig(dealerId);
    if (!config) {
      return res.status(404).json({
        success: false,
        booked: false,
        available: false,
        message: 'Dealer not found.',
        speakable: "I couldn't find that dealership."
      });
    }

    const timeZone = config.timezone || 'Asia/Karachi';
    const serviceDept = getServiceDepartment(config);
    if (!serviceDept || !serviceDept.hours || serviceDept.hours.length === 0) {
      return res.status(400).json({
        success: false,
        booked: false,
        available: false,
        message: 'Service hours not configured.',
        speakable: "Service booking isn't set up for this dealer."
      });
    }

    const weekday = getWeekdayInTimezone(dateStr, timeZone);
    const dayHours = serviceDept.hours.find((h) => (h.day || '').toLowerCase() === weekday.toLowerCase());

    // Holiday
    const holidayTable = holiday.tableName;
    const holidayCols = holiday.columns;
    const { data: holidayRow } = await supabase
      .from(holidayTable)
      .select('*')
      .eq(holidayCols.dealer_id, dealerId)
      .eq(holidayCols.holiday_date, dateStr)
      .maybeSingle();
    if (holidayRow && holidayRow[holidayCols.is_closed]) {
      return res.status(200).json({
        success: true,
        booked: false,
        available: false,
        message: 'We are closed on that day.',
        speakable: "We're closed on that day. Please choose another date.",
        reason: 'holiday'
      });
    }

    if (!dayHours || dayHours.is_closed) {
      return res.status(200).json({
        success: true,
        booked: false,
        available: false,
        message: `We are closed on ${weekday}s.`,
        speakable: `We're closed on ${weekday}s. Please choose another day.`,
        reason: 'closed_day'
      });
    }

    if (!isWithinWorkingHours(dayHours.open, dayHours.close, timeHHMM)) {
      let availableSlots = [];
      try {
        const calendarId = getCalendarId(dealerId, calendar_id);
        availableSlots = await findAvailableSlotsForDate({
          dealerId,
          dateStr,
          timeZone,
          serviceDept,
          preferredTimeHHMM: dayHours.open,
          calendarId
        });
      } catch (e) {
        console.error('Error computing alternative slots:', e);
      }
      return res.status(200).json({
        success: true,
        booked: false,
        available: false,
        message: `Service is not available at that time. We're open ${dayHours.open} to ${dayHours.close} on ${weekday}s.`,
        speakable: `We're not open at that time. On ${weekday}s we're open from ${dayHours.open} to ${dayHours.close}. I can offer you another time if you'd like.`,
        reason: 'outside_working_hours',
        available_slots: availableSlots
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
        booked: false,
        available: false,
        message: 'Unable to check calendar.',
        speakable: "I couldn't check our calendar. Please try again in a moment."
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
        console.error('Error computing alternative slots:', e);
      }
      return res.status(200).json({
        success: true,
        booked: false,
        available: false,
        message: 'That time is already booked.',
        speakable: "Sorry, that time is already taken. Would you like a different time?",
        reason: 'already_booked',
        available_slots: availableSlots
      });
    }

    // Slot is available — book it
    const summary = `service_request${customer_name ? ` - ${customer_name}` : ''}`;
    const description = [customer_phone && `Phone: ${customer_phone}`, notes].filter(Boolean).join('\n');
    let result;
    try {
      result = await calendarService.createEvent(calendarId, startUTC, endUTC, summary, description, timeZone);
    } catch (err) {
      console.error('Calendar create error:', err);
      return res.status(500).json({
        success: false,
        booked: false,
        available: true,
        message: 'Booking could not be completed.',
        speakable: "I found the slot but couldn't complete the booking. Please try again or call us back."
      });
    }

    const displayTime = DateTime.fromISO(`${dateStr}T${timeHHMM}:00`, { zone: timeZone }).toFormat('h:mm a');
    // Do not say the year (caller didn't provide it; current year is assumed).
    const displayDate = DateTime.fromISO(dateStr, { zone: timeZone }).toFormat('cccc, MMM d');

    try {
      const saTable = serviceAppointment.tableName;
      const saCols = serviceAppointment.columns;
      const startLocal = DateTime.fromISO(`${dateStr}T${timeHHMM}:00`, { zone: timeZone });
      const endLocal = startLocal.plus({ minutes: SLOT_DURATION_MINUTES });
      const insertPayload = {
        [saCols.dealer_id]: dealerRow[dealerCols.id] != null ? String(dealerRow[dealerCols.id]) : null,
        [saCols.dealer_phone]: dealer_phone,
        [saCols.dealer_name]: dealerRow[dealerCols.dealer_name],
        [saCols.customer_name]: customer_name || null,
        [saCols.customer_phone]: customer_phone || null,
        [saCols.customer_email]: customer_email || null,
        [saCols.vehicle_make]: vehicle_make || null,
        [saCols.vehicle_model]: vehicle_model || null,
        [saCols.vehicle_year]: vehicle_year || null,
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
      const { error: saError } = await supabase.from(saTable).insert([insertPayload]);
      if (saError) console.error('Failed to insert service_appointments row:', saError);

      const serviceDeptEmail = await getDepartmentContactEmail(dealerRow[dealerCols.id], 'service');
      const dealerEmail = dealerRow[dealerCols.contact_email] || null;
      const recipientEmail = serviceDeptEmail || dealerEmail;
      if (shouldSendBookingEmails && (customer_email || recipientEmail)) {
        emailService
          .notifyRequestReceived({
            dealerName: dealerRow[dealerCols.dealer_name],
            dealerEmail: recipientEmail,
            customerName: customer_name || null,
            customerEmail: customer_email || null,
            customerPhone: customer_phone || null,
            summary: notes || null,
            isServiceBooking: true,
            requestType: 'service',
            appointmentDate: displayDate,
            appointmentTime: displayTime,
            vehicleMake: vehicle_make || null,
            vehicleModel: vehicle_model || null,
            vehicleYear: vehicle_year || null
          })
          .catch((err) => console.error('[Email] notifyRequestReceived error:', err));
      }
    } catch (e) {
      console.error('Unexpected error inserting service_appointments:', e);
    }

    return res.status(201).json({
      success: true,
      booked: true,
      available: true,
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
    console.error('checkAndBook error:', err);
    res.status(500).json({
      success: false,
      booked: false,
      available: false,
      message: 'Something went wrong.',
      speakable: "Something went wrong. Please try again."
    });
  }
}

module.exports = {
  checkAvailability,
  bookService,
  checkAndBook
};

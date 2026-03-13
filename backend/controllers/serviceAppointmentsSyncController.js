const supabase = require('../config/supabaseClient');
const { dealer, serviceAppointment } = require('../models');
const calendarService = require('../services/calendarService');

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

// POST /api/service-appointments/sync?dealer_phone=...
// Reads upcoming events from Google Calendar and upserts into service_appointments if missing.
async function syncServiceAppointmentsFromCalendar(req, res) {
  try {
    const { dealer_phone } = req.query;
    if (!dealer_phone) {
      return res.status(400).json({ error: 'dealer_phone is required' });
    }

    const dealerRow = await findDealerByPrimaryPhone(dealer_phone);
    if (!dealerRow) {
      return res.status(404).json({ error: 'Dealer not found for this phone number' });
    }

    const dealerCols = dealer.columns;
    const dealerName = dealerRow[dealerCols.dealer_name];

    const calendarId =
      process.env.DEFAULT_CALENDAR_ID ||
      process.env.CALENDAR_ID ||
      'bilalsonofkhirsheed@gmail.com';

    const calendar = calendarService.getCalendarClient();

    const now = new Date();
    const inSeven = new Date();
    inSeven.setDate(now.getDate() + 7);

    const result = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: inSeven.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    const items = result.data.items || [];
    const saTable = serviceAppointment.tableName;
    const saCols = serviceAppointment.columns;

    let inserted = 0;

    for (const ev of items) {
      const eventId = ev.id;
      if (!eventId) continue;

      // Skip if already present
      // eslint-disable-next-line no-await-in-loop
      const { data: existing, error: selError } = await supabase
        .from(saTable)
        .select('*')
        .eq(saCols.calendar_event_id, eventId)
        .maybeSingle();
      if (selError) {
        console.error('Error checking existing service_appointments:', selError);
        continue;
      }
      if (existing) continue;

      const start = ev.start?.dateTime || ev.start?.date;
      const end = ev.end?.dateTime || ev.end?.date;
      if (!start || !end) continue;

      const startDate = new Date(start);
      const endDate = new Date(end);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) continue;

      const timeZone = ev.start?.timeZone || 'Asia/Karachi';

      const preferredDate = startDate.toISOString().slice(0, 10); // YYYY-MM-DD
      const preferredTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(
        startDate.getMinutes()
      ).padStart(2, '0')}`;

      const insertPayload = {
        [saCols.dealer_id]: null,
        [saCols.dealer_phone]: dealer_phone,
        [saCols.dealer_name]: dealerName,
        [saCols.customer_name]: null,
        [saCols.customer_phone]: null,
        [saCols.customer_email]: null,
        [saCols.vehicle_make]: null,
        [saCols.vehicle_model]: null,
        [saCols.vehicle_year]: null,
        [saCols.service_request]: ev.summary || null,
        [saCols.start_time_utc]: startDate.toISOString(),
        [saCols.end_time_utc]: endDate.toISOString(),
        [saCols.start_time_local]: startDate.toISOString(),
        [saCols.end_time_local]: endDate.toISOString(),
        [saCols.local_timezone]: timeZone,
        [saCols.preferred_date]: preferredDate,
        [saCols.preferred_time]: preferredTime,
        [saCols.calendar_event_id]: eventId,
        [saCols.calendar_html_link]: ev.htmlLink || null
      };

      // eslint-disable-next-line no-await-in-loop
      const { error: insError } = await supabase.from(saTable).insert([insertPayload]);
      if (insError) {
        console.error('Failed to insert service_appointments from calendar:', insError);
        continue;
      }
      inserted += 1;
    }

    return res.json({
      dealer_name: dealerName,
      dealer_phone,
      synced_events: inserted
    });
  } catch (err) {
    console.error('syncServiceAppointmentsFromCalendar error:', err);
    return res.status(500).json({ error: 'Failed to sync appointments from calendar' });
  }
}

module.exports = {
  syncServiceAppointmentsFromCalendar
};


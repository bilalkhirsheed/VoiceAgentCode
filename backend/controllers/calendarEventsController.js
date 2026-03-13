const calendarService = require('../services/calendarService');
const { dealer } = require('../models');
const supabase = require('../config/supabaseClient');

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

// GET /api/calendar-events?dealer_phone=...&time_min=...&time_max=...
async function getCalendarEvents(req, res) {
  try {
    const { dealer_phone, time_min, time_max, calendar_id } = req.query;

    if (!dealer_phone) {
      return res.status(400).json({ error: 'dealer_phone is required' });
    }

    const dealerRow = await findDealerByPrimaryPhone(dealer_phone);
    if (!dealerRow) {
      return res.status(404).json({ error: 'Dealer not found for this phone number' });
    }

    const calendarId = calendar_id || 'bilalsonofkhirsheed@gmail.com';

    const now = new Date();
    const defaultStart = new Date(now);
    const defaultEnd = new Date(now);
    defaultEnd.setDate(defaultEnd.getDate() + 7);

    const timeMin = time_min ? new Date(time_min) : defaultStart;
    const timeMax = time_max ? new Date(time_max) : defaultEnd;

    const calendar = calendarService.getCalendarClient();
    const result = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = (result.data.items || []).map((e) => ({
      id: e.id,
      summary: e.summary,
      description: e.description,
      start: e.start,
      end: e.end,
      htmlLink: e.htmlLink
    }));

    res.json({ events });
  } catch (err) {
    console.error('getCalendarEvents error:', err);
    res.status(500).json({ error: 'Failed to load calendar events' });
  }
}

module.exports = {
  getCalendarEvents
};


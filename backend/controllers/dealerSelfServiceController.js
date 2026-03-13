const supabase = require('../config/supabaseClient');
const { dealer, departmentHours, holiday } = require('../models');

async function resolveDealerFromPhone(dealerPhone) {
  const dealerTable = dealer.tableName;
  const dealerCols = dealer.columns;

  const variants = [dealerPhone, dealerPhone.startsWith('+') ? dealerPhone : `+${dealerPhone}`, dealerPhone.replace(/^\+/, '')];
  let dealerRow = null;

  for (const phone of [...new Set(variants)]) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from(dealerTable)
      .select('*')
      .eq(dealerCols.primary_phone, phone)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data) {
      dealerRow = data;
      break;
    }
  }

  if (!dealerRow) return null;
  return dealerRow;
}

// PUT /api/dealer/:dealerId/departments/:departmentId/hours?dealer_phone=...
async function dealerUpdateDepartmentHours(req, res) {
  try {
    const { departmentId } = req.params;
    const dealerPhone = (req.query.dealer_phone || '').trim();
    if (!dealerPhone) {
      return res.status(400).json({ error: 'dealer_phone query param is required' });
    }

    const dealerRow = await resolveDealerFromPhone(dealerPhone);
    if (!dealerRow) {
      return res.status(403).json({ error: 'Not authorized to modify this dealer' });
    }

    const hoursTable = departmentHours.tableName;
    const hoursCols = departmentHours.columns;
    const { hours } = req.body || {};

    if (!Array.isArray(hours)) {
      return res.status(400).json({ error: 'hours array is required' });
    }

    const { error: delError } = await supabase
      .from(hoursTable)
      .delete()
      .eq(hoursCols.department_id, departmentId);

    if (delError) {
      return res.status(400).json({ error: delError.message });
    }

    const rows = hours.map((h) => ({
      [hoursCols.department_id]: departmentId,
      [hoursCols.day_of_week]: h.day_of_week,
      [hoursCols.open_time]: h.open_time,
      [hoursCols.close_time]: h.close_time,
      [hoursCols.is_closed]: h.is_closed ?? false
    }));

    const { data, error } = await supabase.from(hoursTable).insert(rows).select('*');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// POST /api/dealer/:dealerId/holidays?dealer_phone=...
async function dealerCreateHoliday(req, res) {
  try {
    const { dealerId } = req.params;
    const dealerPhone = (req.query.dealer_phone || '').trim();
    if (!dealerPhone) {
      return res.status(400).json({ error: 'dealer_phone query param is required' });
    }

    const dealerRow = await resolveDealerFromPhone(dealerPhone);
    if (!dealerRow) {
      return res.status(403).json({ error: 'Not authorized to modify this dealer' });
    }

    const holidayTable = holiday.tableName;
    const holidayCols = holiday.columns;
    const { holiday_date, description, is_closed } = req.body || {};

    if (!holiday_date) {
      return res.status(400).json({ error: 'holiday_date is required' });
    }

    const dealerCols = dealer.columns;
    const dealerIdForHoliday = dealerRow[dealerCols.id];

    const { data: maxRow } = await supabase
      .from(holidayTable)
      .select(holidayCols.id)
      .order(holidayCols.id, { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextId = (maxRow && maxRow[holidayCols.id] != null)
      ? Number(maxRow[holidayCols.id]) + 1
      : 1;

    const payload = {
      [holidayCols.id]: nextId,
      [holidayCols.dealer_id]: dealerIdForHoliday,
      [holidayCols.holiday_date]: holiday_date,
      [holidayCols.description]: description || null,
      [holidayCols.is_closed]: is_closed ?? true
    };

    const { data, error } = await supabase
      .from(holidayTable)
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// PUT /api/dealer/:dealerId/holidays/:holidayId?dealer_phone=...
async function dealerUpdateHoliday(req, res) {
  try {
    const { dealerId, holidayId } = req.params;
    const dealerPhone = (req.query.dealer_phone || '').trim();
    if (!dealerPhone) {
      return res.status(400).json({ error: 'dealer_phone query param is required' });
    }

    const dealerRow = await resolveDealerFromPhone(dealerPhone);
    if (!dealerRow) {
      return res.status(403).json({ error: 'Not authorized to modify this dealer' });
    }

    const dealerCols = dealer.columns;
    const actualDealerId = dealerRow[dealerCols.id];
    const holidayTable = holiday.tableName;
    const holidayCols = holiday.columns;

    const payload = {};
    const { holiday_date, description, is_closed } = req.body || {};

    if (holiday_date !== undefined) payload[holidayCols.holiday_date] = holiday_date;
    if (description !== undefined) payload[holidayCols.description] = description;
    if (is_closed !== undefined) payload[holidayCols.is_closed] = is_closed;

    const { data, error } = await supabase
      .from(holidayTable)
      .update(payload)
      .eq(holidayCols.id, holidayId)
      .eq(holidayCols.dealer_id, actualDealerId)
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Holiday not found' });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// DELETE /api/dealer/:dealerId/holidays/:holidayId?dealer_phone=...
async function dealerDeleteHoliday(req, res) {
  try {
    const { dealerId, holidayId } = req.params;
    const dealerPhone = (req.query.dealer_phone || '').trim();
    if (!dealerPhone) {
      return res.status(400).json({ error: 'dealer_phone query param is required' });
    }

    const dealerRow = await resolveDealerFromPhone(dealerPhone);
    if (!dealerRow) {
      return res.status(403).json({ error: 'Not authorized to modify this dealer' });
    }

    const dealerCols = dealer.columns;
    const actualDealerId = dealerRow[dealerCols.id];
    const holidayTable = holiday.tableName;
    const holidayCols = holiday.columns;

    const { error } = await supabase
      .from(holidayTable)
      .delete()
      .eq(holidayCols.id, holidayId)
      .eq(holidayCols.dealer_id, actualDealerId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// GET /api/dealer/:dealerId/holidays?dealer_phone=...
async function dealerListHolidays(req, res) {
  try {
    const { dealerId } = req.params;
    const dealerPhone = (req.query.dealer_phone || '').trim();
    if (!dealerPhone) {
      return res.status(400).json({ error: 'dealer_phone query param is required' });
    }

    const dealerRow = await resolveDealerFromPhone(dealerPhone);
    if (!dealerRow) {
      return res.status(403).json({ error: 'Not authorized to view this dealer' });
    }

    const dealerCols = dealer.columns;
    const actualDealerId = dealerRow[dealerCols.id];
    const holidayTable = holiday.tableName;
    const holidayCols = holiday.columns;

    const { data, error } = await supabase
      .from(holidayTable)
      .select('*')
      .eq(holidayCols.dealer_id, actualDealerId)
      .order(holidayCols.holiday_date, { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json(data || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  dealerUpdateDepartmentHours,
  dealerCreateHoliday,
  dealerUpdateHoliday,
  dealerDeleteHoliday,
  dealerListHolidays
};


const supabase = require('../config/supabaseClient');
const { dealer, department, departmentHours, holiday } = require('../models');
const { buildDealerConfig } = require('./dealerController');

// --- Helpers ---

function getPagination(req, defaultLimit = 20) {
  const page = Number(req.query.page || '1') || 1;
  const limit = Number(req.query.limit || defaultLimit) || defaultLimit;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { page, limit, from, to };
}

// --- Dealers ---

// GET /api/admin/dealers?search=...&page=...
async function adminListDealers(req, res) {
  try {
    const dealerTable = dealer.tableName;
    const dealerCols = dealer.columns;
    const search = (req.query.search || '').trim();
    const { from, to, page, limit } = getPagination(req);

    let query = supabase.from(dealerTable).select('*', { count: 'exact' }).order(dealerCols.created_at, {
      ascending: false
    });

    if (search) {
      query = query.or(
        `${dealerCols.dealer_name}.ilike.%${search}%,${dealerCols.primary_phone}.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      items: data || [],
      total: count || 0,
      page,
      pageSize: limit
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// GET /api/admin/dealers/:dealerId
async function adminGetDealerDetail(req, res) {
  try {
    const dealerId = req.params.dealerId;
    const config = await buildDealerConfig(dealerId);

    if (!config) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    // Also include holidays list
    const holidayTable = holiday.tableName;
    const holidayCols = holiday.columns;
    const { data: holidays, error: hErr } = await supabase
      .from(holidayTable)
      .select('*')
      .eq(holidayCols.dealer_id, dealerId)
      .order(holidayCols.holiday_date, { ascending: true });

    if (hErr) {
      return res.status(500).json({ error: hErr.message });
    }

    return res.json({
      dealer: config,
      holidays: holidays || []
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// POST /api/admin/dealers
async function adminCreateDealer(req, res) {
  try {
    const dealerTable = dealer.tableName;
    const dealerCols = dealer.columns;

    const { dealer_name, primary_phone, timezone } = req.body || {};

    if (!dealer_name || !primary_phone || !timezone) {
      return res
        .status(400)
        .json({ error: 'dealer_name, primary_phone, and timezone are required' });
    }

    const payload = {
      [dealerCols.dealer_name]: dealer_name,
      [dealerCols.dealer_code]: req.body.dealer_code || null,
      [dealerCols.timezone]: timezone,
      [dealerCols.address]: req.body.address || null,
      [dealerCols.city]: req.body.city || null,
      [dealerCols.state]: req.body.state || null,
      [dealerCols.country]: req.body.country || null,
      [dealerCols.zip_code]: req.body.zip_code || null,
      [dealerCols.website_url]: req.body.website_url || null,
      [dealerCols.default_voice]: req.body.default_voice || 'female',
      [dealerCols.primary_phone]: primary_phone
    };

    const { data, error } = await supabase
      .from(dealerTable)
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Automatically create common departments so at least one exists (Sales, Service, Parts)
    const deptTable = department.tableName;
    const deptCols = department.columns;
    const baseDealerId = data[dealerCols.id];
    const deptPayloads = ['Sales', 'Service', 'Parts'].map((name) => ({
      [deptCols.dealer_id]: baseDealerId,
      [deptCols.department_name]: name
    }));
    await supabase.from(deptTable).insert(deptPayloads);

    return res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// PUT /api/admin/dealers/:dealerId
async function adminUpdateDealer(req, res) {
  try {
    const dealerId = req.params.dealerId;
    const dealerTable = dealer.tableName;
    const dealerCols = dealer.columns;

    const body = req.body || {};
    const payload = {};

    Object.entries(dealerCols).forEach(([key, columnName]) => {
      if (key === 'id' || key === 'created_at' || key === 'updated_at') return;
      if (body[key] !== undefined) {
        payload[columnName] = body[key];
      }
    });

    const { data, error } = await supabase
      .from(dealerTable)
      .update(payload)
      .eq(dealerCols.id, dealerId)
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// DELETE /api/admin/dealers/:dealerId
async function adminDeleteDealer(req, res) {
  try {
    const dealerId = req.params.dealerId;
    const dealerTable = dealer.tableName;
    const dealerCols = dealer.columns;

    const { error } = await supabase
      .from(dealerTable)
      .delete()
      .eq(dealerCols.id, dealerId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// --- Departments ---

// POST /api/admin/dealers/:dealerId/departments
async function adminCreateDepartment(req, res) {
  try {
    const dealerId = req.params.dealerId;
    const deptTable = department.tableName;
    const deptCols = department.columns;

    const { department_name } = req.body || {};
    if (!department_name) {
      return res.status(400).json({ error: 'department_name is required' });
    }

    const payload = {
      [deptCols.dealer_id]: dealerId,
      [deptCols.department_name]: department_name,
      [deptCols.transfer_phone]: req.body.transfer_phone || null,
      [deptCols.transfer_type]: req.body.transfer_type || null,
      [deptCols.after_hours_action]: req.body.after_hours_action || null
    };

    const { data, error } = await supabase
      .from(deptTable)
      .insert([payload], { defaultToNull: false })
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

// PUT /api/admin/departments/:departmentId
async function adminUpdateDepartment(req, res) {
  try {
    const departmentId = req.params.departmentId;
    const deptTable = department.tableName;
    const deptCols = department.columns;

    const payload = {};
    const { department_name, transfer_phone, transfer_type, after_hours_action } = req.body || {};

    if (department_name !== undefined) payload[deptCols.department_name] = department_name;
    if (transfer_phone !== undefined) payload[deptCols.transfer_phone] = transfer_phone;
    if (transfer_type !== undefined) payload[deptCols.transfer_type] = transfer_type;
    if (after_hours_action !== undefined) payload[deptCols.after_hours_action] = after_hours_action;

    const { data, error } = await supabase
      .from(deptTable)
      .update(payload)
      .eq(deptCols.id, departmentId)
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Department not found' });
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// DELETE /api/admin/departments/:departmentId
async function adminDeleteDepartment(req, res) {
  try {
    const departmentId = req.params.departmentId;
    const deptTable = department.tableName;
    const deptCols = department.columns;

    const { error } = await supabase
      .from(deptTable)
      .delete()
      .eq(deptCols.id, departmentId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// --- Hours ---

// POST /api/admin/departments/:departmentId/hours
// Expects body.hours: [{ day_of_week, open_time, close_time, is_closed }]
async function adminReplaceDepartmentHours(req, res) {
  try {
    const departmentId = req.params.departmentId;
    const hoursTable = departmentHours.tableName;
    const hoursCols = departmentHours.columns;

    const { hours } = req.body || {};
    if (!Array.isArray(hours)) {
      return res.status(400).json({ error: 'hours array is required' });
    }

    // Delete existing hours
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

    const { data, error } = await supabase
      .from(hoursTable)
      .insert(rows)
      .select('*');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// PUT /api/admin/hours/:hoursId
async function adminUpdateHoursRow(req, res) {
  try {
    const hoursId = req.params.hoursId;
    const hoursTable = departmentHours.tableName;
    const hoursCols = departmentHours.columns;

    const payload = {};
    const { day_of_week, open_time, close_time, is_closed } = req.body || {};

    if (day_of_week !== undefined) payload[hoursCols.day_of_week] = day_of_week;
    if (open_time !== undefined) payload[hoursCols.open_time] = open_time;
    if (close_time !== undefined) payload[hoursCols.close_time] = close_time;
    if (is_closed !== undefined) payload[hoursCols.is_closed] = is_closed;

    const { data, error } = await supabase
      .from(hoursTable)
      .update(payload)
      .eq(hoursCols.id, hoursId)
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Hours row not found' });
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// DELETE /api/admin/hours/:hoursId
async function adminDeleteHoursRow(req, res) {
  try {
    const hoursId = req.params.hoursId;
    const hoursTable = departmentHours.tableName;
    const hoursCols = departmentHours.columns;

    const { error } = await supabase
      .from(hoursTable)
      .delete()
      .eq(hoursCols.id, hoursId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// --- Holidays ---

// GET /api/admin/dealers/:dealerId/holidays
async function adminListHolidays(req, res) {
  try {
    const dealerId = req.params.dealerId;
    const holidayTable = holiday.tableName;
    const holidayCols = holiday.columns;

    const { data, error } = await supabase
      .from(holidayTable)
      .select('*')
      .eq(holidayCols.dealer_id, dealerId)
      .order(holidayCols.holiday_date, { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json(data || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// POST /api/admin/dealers/:dealerId/holidays
async function adminCreateHoliday(req, res) {
  try {
    const dealerId = req.params.dealerId;
    const holidayTable = holiday.tableName;
    const holidayCols = holiday.columns;

    const { holiday_date, description, is_closed } = req.body || {};

    if (!holiday_date) {
      return res.status(400).json({ error: 'holiday_date is required' });
    }

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
      [holidayCols.dealer_id]: dealerId,
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

// PUT /api/admin/holidays/:holidayId
async function adminUpdateHoliday(req, res) {
  try {
    const holidayId = req.params.holidayId;
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
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Holiday not found' });
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// DELETE /api/admin/holidays/:holidayId
async function adminDeleteHoliday(req, res) {
  try {
    const holidayId = req.params.holidayId;
    const holidayTable = holiday.tableName;
    const holidayCols = holiday.columns;

    const { error } = await supabase
      .from(holidayTable)
      .delete()
      .eq(holidayCols.id, holidayId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  adminListDealers,
  adminGetDealerDetail,
  adminCreateDealer,
  adminUpdateDealer,
  adminDeleteDealer,
  adminCreateDepartment,
  adminUpdateDepartment,
  adminDeleteDepartment,
  adminReplaceDepartmentHours,
  adminUpdateHoursRow,
  adminDeleteHoursRow,
  adminListHolidays,
  adminCreateHoliday,
  adminUpdateHoliday,
  adminDeleteHoliday
};


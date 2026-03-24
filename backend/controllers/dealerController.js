const supabase = require('../config/supabaseClient');
const { dealer, department, departmentHours, holiday } = require('../models');

// Helper: build dealer config response for Retell and admin tools
async function buildDealerConfig(dealerId) {
  const dealerTable = dealer.tableName;
  const dealerCols = dealer.columns;

  const { data: dealerRow, error: dealerError } = await supabase
    .from(dealerTable)
    .select('*')
    .eq(dealerCols.id, dealerId)
    .single();

  if (dealerError) {
    throw new Error(dealerError.message);
  }

  if (!dealerRow) {
    return null;
  }

  const deptTable = department.tableName;
  const deptCols = department.columns;

  const { data: departmentsRows, error: deptError } = await supabase
    .from(deptTable)
    .select('*')
    .eq(deptCols.dealer_id, dealerId);

  if (deptError) {
    throw new Error(deptError.message);
  }

  const dhTable = departmentHours.tableName;
  const dhCols = departmentHours.columns;

  const departmentIds = departmentsRows.map((d) => d[deptCols.id]);

  let hoursRows = [];
  if (departmentIds.length > 0) {
    const { data, error } = await supabase
      .from(dhTable)
      .select('*')
      .in(dhCols.department_id, departmentIds);

    if (error) {
      throw new Error(error.message);
    }

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

  const departmentsConfig = departmentsRows.map((dept) => {
    const deptId = dept[deptCols.id];
    return {
      id: deptId,
      name: dept[deptCols.department_name],
      transfer_phone: dept[deptCols.transfer_phone],
      transfer_type: dept[deptCols.transfer_type],
      after_hours_action: dept[deptCols.after_hours_action],
      contact_email: dept[deptCols.contact_email] || null,
      hours: hoursByDepartment[deptId] || []
    };
  });

  return {
    dealer_id: dealerRow[dealerCols.id],
    dealer_name: dealerRow[dealerCols.dealer_name],
    voice: dealerRow[dealerCols.default_voice],
    timezone: dealerRow[dealerCols.timezone],
    address: dealerRow[dealerCols.address],
    city: dealerRow[dealerCols.city],
    state: dealerRow[dealerCols.state],
    country: dealerRow[dealerCols.country],
    zip_code: dealerRow[dealerCols.zip_code],
    primary_phone: dealerRow[dealerCols.primary_phone],
    website_url: dealerRow[dealerCols.website_url],
    contact_email: dealerRow[dealerCols.contact_email] || null,
    departments: departmentsConfig
  };
}

// POST /api/dealers
async function createDealer(req, res) {
  try {
    const dealerTable = dealer.tableName;
    const dealerCols = dealer.columns;

    const payload = {
      [dealerCols.dealer_name]: req.body.dealer_name,
      [dealerCols.dealer_code]: req.body.dealer_code || null,
      [dealerCols.timezone]: req.body.timezone,
      [dealerCols.address]: req.body.address || null,
      [dealerCols.city]: req.body.city || null,
      [dealerCols.state]: req.body.state || null,
      [dealerCols.country]: req.body.country || null,
      [dealerCols.zip_code]: req.body.zip_code || null,
      [dealerCols.website_url]: req.body.website_url || null,
      [dealerCols.default_voice]: req.body.default_voice || 'female',
      [dealerCols.primary_phone]: req.body.primary_phone || null
    };

    const { data, error } = await supabase
      .from(dealerTable)
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/dealers
async function getAllDealers(req, res) {
  try {
    const dealerTable = dealer.tableName;

    const { data, error } = await supabase.from(dealerTable).select('*');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/dealers/:dealerId
async function getDealerById(req, res) {
  try {
    const dealerId = req.params.dealerId;
    const dealerTable = dealer.tableName;
    const dealerCols = dealer.columns;

    const { data, error } = await supabase
      .from(dealerTable)
      .select('*')
      .eq(dealerCols.id, dealerId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/dealers/:dealerId
async function updateDealer(req, res) {
  try {
    const dealerId = req.params.dealerId;
    const dealerTable = dealer.tableName;
    const dealerCols = dealer.columns;

    const payload = {};
    const body = req.body;

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

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/dealers/:dealerId
async function deleteDealer(req, res) {
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

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/dealers/:dealerId/config
async function getDealerConfig(req, res) {
  try {
    const dealerId = req.params.dealerId;
    const config = await buildDealerConfig(dealerId);

    if (!config) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/dealer-config/:did or GET /api/dealer-config?did= — fetch dealer config by DID (phone number)
async function getDealerConfigByDid(req, res) {
  try {
    const rawDid = req.params.did || req.query.did || '';
    console.log('Incoming DID (query.did):', req.query.did);
    console.log('[getDealerConfigByDid] rawDid:', rawDid, 'query:', req.query, 'params:', req.params);
    const decodedDid = decodeURIComponent(rawDid || '');

    // Normalize DID: remove spaces and non-digits, work with digits only
    const digitDid = (decodedDid || '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/\D/g, ''); // keep digits only

    if (!digitDid) {
      console.log('[getDealerConfigByDid] Missing DID after normalization, decodedDid:', decodedDid);
      return res.status(400).json({ error: 'Missing did (use path /dealer-config/:did or query ?did=+1234567890)' });
    }

    // For matching we will compare on "digits only" so that formats like
    // "+14374940150", "14374940150" or "  +1 437 494 0150 " all work.
    const dealerTable = dealer.tableName;
    const dealerCols = dealer.columns;

    let dealerRow = null;

    // Helper to normalize phone fields from DB to digits-only
    const normalizeDbPhone = (value) =>
      (value || '')
        .toString()
        .trim()
        .replace(/\s+/g, '')
        .replace(/\D/g, '');

    // 1) Try inbound_did first (preferred)
    {
      const { data, error } = await supabase.from(dealerTable).select('*');
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      if (Array.isArray(data)) {
        dealerRow = data.find((row) => normalizeDbPhone(row[dealerCols.inbound_did]) === digitDid) || null;
      }
    }

    // 2) Fallback: try primary_phone (legacy behaviour)
    if (!dealerRow) {
      const { data, error } = await supabase.from(dealerTable).select('*');
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      if (Array.isArray(data)) {
        dealerRow = data.find((row) => normalizeDbPhone(row[dealerCols.primary_phone]) === digitDid) || null;
      }
    }

    if (!dealerRow) {
      return res.status(404).json({ error: 'Dealer not found for this DID' });
    }

    const dealerId = dealerRow[dealerCols.id];
    const config = await buildDealerConfig(dealerId);

    if (!config) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    // Flat transfer phones for Retell "Store as Variables" (e.g. {{service_transfer_phone}})
    const departments = config.departments || [];
    const byName = (name) => departments.find((d) => (d.name || '').toLowerCase() === name.toLowerCase());
    const payload = {
      ...config,
      service_transfer_phone: byName('Service')?.transfer_phone || null,
      sales_transfer_phone: byName('Sales')?.transfer_phone || null,
      parts_transfer_phone: byName('Parts')?.transfer_phone || null
    };

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function getZonedNowParts(timeZone) {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = dtf.formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    weekday: get('weekday'),
    hour: Number(get('hour')),
    minute: Number(get('minute'))
  };
}

function getZonedTodayISODate(timeZone) {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  // en-CA gives YYYY-MM-DD
  return dtf.format(now);
}

function hhmmToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [hh, mm] = hhmm.split(':').map((x) => Number(x));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function computeIsOpenFromConfig(config, timeZone, departmentName) {
  const { weekday, hour, minute } = getZonedNowParts(timeZone);
  const nowMinutes = hour * 60 + minute;

  const departments = config?.departments || [];
  if (!departments.length) return false;

  let targetDept = departments[0];
  if (departmentName) {
    let depLower = String(departmentName).trim().toLowerCase();
    const normalized = depLower.replace(/\bdepartment\b/g, '').replace(/\bdept\b/g, '').trim();

    // 1) Exact match
    const exact = departments.find((d) => String(d?.name || '').trim().toLowerCase() === depLower);
    // 2) Normalized match (remove "department"/"dept")
    const normalizedMatch = departments.find((d) => String(d?.name || '').trim().toLowerCase() === normalized);
    // 3) Fuzzy match (substring either way)
    const fuzzy = departments.find((d) => {
      const dn = String(d?.name || '').trim().toLowerCase();
      return dn && (dn.includes(depLower) || depLower.includes(dn) || dn.includes(normalized) || normalized.includes(dn));
    });

    targetDept = exact || normalizedMatch || fuzzy || targetDept;
  }

  const hoursList = targetDept.hours || [];
  const weekdayNorm = String(weekday || '').trim();
  const today = hoursList.find((h) => String(h?.day || '').trim() === weekdayNorm);

  if (!today) return false;
  if (today.is_closed) return false;

  const openMinutes = hhmmToMinutes(today.open);
  const closeMinutes = hhmmToMinutes(today.close);
  if (openMinutes === null || closeMinutes === null) return false;

  const isOpen = nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
  // Debugging: understand why "closed" was returned for a department
  console.log('[DealerOpenStatus][computeIsOpenFromConfig]', {
    requestedDepartment: departmentName || '(none)',
    matchedDepartment: targetDept?.name || null,
    weekday: weekdayNorm,
    nowMinutes,
    today,
    openMinutes,
    closeMinutes,
    isOpen
  });

  return isOpen;
}

// GET /api/dealer-open-status/:did/:departmentName — returns dealer_name, is_open, voice
async function getDealerOpenStatusByDid(req, res) {
  try {
    const rawDid = req.params.did || '';
    const decodedDid = decodeURIComponent(rawDid || '');

    const digitDid = (decodedDid || '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/\D/g, '');

    const departmentName = req.params.departmentName || '';
    const dealerTable = dealer.tableName;
    const dealerCols = dealer.columns;

    const normalizeDbPhone = (value) =>
      (value || '')
        .toString()
        .trim()
        .replace(/\s+/g, '')
        .replace(/\D/g, '');

    let dealerRow = null;

    // 1) Try inbound_did first
    {
      const { data, error } = await supabase.from(dealerTable).select('*');
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      if (Array.isArray(data)) {
        dealerRow = data.find((row) => normalizeDbPhone(row[dealerCols.inbound_did]) === digitDid) || null;
      }
    }

    // 2) Fallback: try primary_phone for legacy data
    if (!dealerRow) {
      const { data, error } = await supabase.from(dealerTable).select('*');
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      if (Array.isArray(data)) {
        dealerRow = data.find((row) => normalizeDbPhone(row[dealerCols.primary_phone]) === digitDid) || null;
      }
    }

    if (!dealerRow) {
      return res.status(404).json({ error: 'Dealer not found for this DID' });
    }

    const dealerId = dealerRow[dealerCols.id];
    const timeZone = 'Asia/Karachi';

    // First: check if today is a holiday for this dealer; if closed, always false
    const holidayTable = holiday.tableName;
    const holidayCols = holiday.columns;
    const todayDate = getZonedTodayISODate(timeZone);

    const { data: holidayRow, error: holidayError } = await supabase
      .from(holidayTable)
      .select('*')
      .eq(holidayCols.dealer_id, dealerId)
      .eq(holidayCols.holiday_date, todayDate)
      .maybeSingle();

    if (holidayError) {
      return res.status(500).json({ error: holidayError.message });
    }

    console.log('[DealerOpenStatus][holiday check]', {
      todayDate,
      dealerId,
      holidayFound: Boolean(holidayRow),
      holiday_is_closed: holidayRow ? holidayRow[holidayCols.is_closed] : null
    });

    const config = await buildDealerConfig(dealerId);

    if (!config) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    if (holidayRow && holidayRow[holidayCols.is_closed]) {
      return res.json({
        dealer_name: config.dealer_name,
        is_open: false,
        voice: config.voice
      });
    }

    // Per your rule: always use Asia/Karachi for open/close calculation
    const is_open = computeIsOpenFromConfig(config, timeZone, departmentName);

    res.json({
      dealer_name: config.dealer_name,
      is_open,
      voice: config.voice
    });
    console.log('[DealerOpenStatus][result]', {
      did: digitDid,
      departmentName,
      dealer_name: config.dealer_name,
      is_open
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createDealer,
  getAllDealers,
  getDealerById,
  updateDealer,
  deleteDealer,
  getDealerConfig,
  getDealerConfigByDid,
  getDealerOpenStatusByDid,
  buildDealerConfig
};


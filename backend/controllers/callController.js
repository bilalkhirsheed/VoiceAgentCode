const supabase = require('../config/supabaseClient');
const { call } = require('../models');
const { randomUUID } = require('crypto');

// POST /api/calls
async function createCall(req, res) {
  try {
    const callTable = call.tableName;
    const cols = call.columns;

    const id = req.body.id || randomUUID();

    const payload = {
      [cols.id]: id,
      [cols.dealer_id]: req.body.dealer_id || null,
      [cols.did]: req.body.did || null,
      [cols.caller_number]: req.body.caller_number || null,
      [cols.start_time]: req.body.start_time || new Date().toISOString(),
      [cols.end_time]: req.body.end_time || null,
      [cols.duration_seconds]: req.body.duration_seconds || null,
      [cols.billable_minutes]: req.body.billable_minutes || null,
      [cols.detected_intent]: req.body.detected_intent || null,
      [cols.outcome_code]: req.body.outcome_code || null,
      [cols.transferred]: req.body.transferred ?? false,
      [cols.transfer_target]: req.body.transfer_target || null,
      [cols.transfer_success]: req.body.transfer_success ?? null,
      [cols.callback_requested]: req.body.callback_requested ?? false,
      [cols.recording_url]: req.body.recording_url || null,
      [cols.config_version]: req.body.config_version || null
    };

    const { data, error } = await supabase
      .from(callTable)
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

// GET /api/calls
async function getCalls(req, res) {
  try {
    const callTable = call.tableName;
    const cols = call.columns;

    let query = supabase.from(callTable).select('*');

    if (req.query.dealer_id) {
      query = query.eq(cols.dealer_id, req.query.dealer_id);
    }
    if (req.query.outcome_code) {
      query = query.eq(cols.outcome_code, req.query.outcome_code);
    }
    if (req.query.from) {
      query = query.gte(cols.start_time, req.query.from);
    }
    if (req.query.to) {
      query = query.lte(cols.start_time, req.query.to);
    }

    const { data, error } = await query.order(cols.start_time, { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/calls/:id
async function getCallById(req, res) {
  try {
    const id = req.params.id;
    const callTable = call.tableName;
    const cols = call.columns;

    const { data, error } = await supabase
      .from(callTable)
      .select('*')
      .eq(cols.id, id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/calls/:id
async function updateCall(req, res) {
  try {
    const id = req.params.id;
    const callTable = call.tableName;
    const cols = call.columns;

    const payload = {};
    const body = req.body;

    Object.entries(cols).forEach(([key, columnName]) => {
      if (key === 'id' || key === 'created_at') return;
      if (body[key] !== undefined) {
        payload[columnName] = body[key];
      }
    });

    const { data, error } = await supabase
      .from(callTable)
      .update(payload)
      .eq(cols.id, id)
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createCall,
  getCalls,
  getCallById,
  updateCall
};


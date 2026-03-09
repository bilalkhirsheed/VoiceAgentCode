const supabase = require('../config/supabaseClient');
const { callbackLog } = require('../models');
const { randomUUID } = require('crypto');

// POST /api/callback-logs
async function createCallbackLog(req, res) {
  try {
    const table = callbackLog.tableName;
    const cols = callbackLog.columns;

    const id = req.body.id || randomUUID();

    const payload = {
      [cols.id]: id,
      [cols.call_id]: req.body.call_id || null,
      [cols.customer_name]: req.body.customer_name || null,
      [cols.phone_number]: req.body.phone_number,
      [cols.preferred_time]: req.body.preferred_time || null
    };

    const { data, error } = await supabase
      .from(table)
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

// GET /api/calls/:callId/callback-logs
async function getCallbackLogsForCall(req, res) {
  try {
    const callId = req.params.callId;
    const table = callbackLog.tableName;
    const cols = callbackLog.columns;

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(cols.call_id, callId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createCallbackLog,
  getCallbackLogsForCall
};


const supabase = require('../config/supabaseClient');
const { callTransfer } = require('../models');
const { randomUUID } = require('crypto');

// POST /api/call-transfers
async function createCallTransfer(req, res) {
  try {
    const table = callTransfer.tableName;
    const cols = callTransfer.columns;

    const id = req.body.id || randomUUID();

    const payload = {
      [cols.id]: id,
      [cols.call_id]: req.body.call_id,
      [cols.department]: req.body.department || null,
      [cols.target_number]: req.body.target_number || null,
      [cols.transfer_time]: req.body.transfer_time || new Date().toISOString(),
      [cols.success]: req.body.success,
      [cols.failure_reason]: req.body.failure_reason || null
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

// GET /api/calls/:callId/transfers
async function getCallTransfers(req, res) {
  try {
    const callId = req.params.callId;
    const table = callTransfer.tableName;
    const cols = callTransfer.columns;

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(cols.call_id, callId)
      .order(cols.transfer_time, { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createCallTransfer,
  getCallTransfers
};


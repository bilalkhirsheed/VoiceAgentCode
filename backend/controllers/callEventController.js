const supabase = require('../config/supabaseClient');
const { callEvent } = require('../models');
const { randomUUID } = require('crypto');

// POST /api/call-events
async function createCallEvent(req, res) {
  try {
    const table = callEvent.tableName;
    const cols = callEvent.columns;

    const id = req.body.id || randomUUID();

    const payload = {
      [cols.id]: id,
      [cols.call_id]: req.body.call_id,
      [cols.event_type]: req.body.event_type,
      [cols.event_time]: req.body.event_time || new Date().toISOString(),
      [cols.node_name]: req.body.node_name || null,
      [cols.intent_detected]: req.body.intent_detected || null,
      [cols.metadata]: req.body.metadata || null
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

// GET /api/calls/:callId/events
async function getCallEvents(req, res) {
  try {
    const callId = req.params.callId;
    const table = callEvent.tableName;
    const cols = callEvent.columns;

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(cols.call_id, callId)
      .order(cols.event_time, { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createCallEvent,
  getCallEvents
};


const supabase = require('../config/supabaseClient');
const { callTag } = require('../models');
const { randomUUID } = require('crypto');

// POST /api/call-tags
async function createCallTag(req, res) {
  try {
    const table = callTag.tableName;
    const cols = callTag.columns;

    const id = req.body.id || randomUUID();

    const payload = {
      [cols.id]: id,
      [cols.call_id]: req.body.call_id,
      [cols.tag]: req.body.tag
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

// GET /api/calls/:callId/tags
async function getCallTags(req, res) {
  try {
    const callId = req.params.callId;
    const table = callTag.tableName;
    const cols = callTag.columns;

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
  createCallTag,
  getCallTags
};


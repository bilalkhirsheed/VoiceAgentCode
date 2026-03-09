const supabase = require('../config/supabaseClient');
const { callTranscript } = require('../models');
const { randomUUID } = require('crypto');

// POST /api/call-transcripts
async function createCallTranscriptEntry(req, res) {
  try {
    const table = callTranscript.tableName;
    const cols = callTranscript.columns;

    const id = req.body.id || randomUUID();

    const payload = {
      [cols.id]: id,
      [cols.call_id]: req.body.call_id,
      [cols.speaker]: req.body.speaker,
      [cols.message]: req.body.message,
      [cols.timestamp]: req.body.timestamp || new Date().toISOString()
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

// GET /api/calls/:callId/transcripts
async function getCallTranscripts(req, res) {
  try {
    const callId = req.params.callId;
    const table = callTranscript.tableName;
    const cols = callTranscript.columns;

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(cols.call_id, callId)
      .order(cols.timestamp, { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createCallTranscriptEntry,
  getCallTranscripts
};


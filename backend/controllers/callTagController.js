const supabase = require('../config/supabaseClient');
const { callTag, call, callAnalysis, callTransfer, callbackLog } = require('../models');
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

    if (data && data.length > 0) {
      return res.json(data);
    }

    // Fallback synthetic tags so UI still has meaningful tags when provider tags are missing.
    const callCols = call.columns;
    const caCols = callAnalysis.columns;
    const trCols = callTransfer.columns;
    const cbCols = callbackLog.columns;
    const normalized = (s) =>
      String(s ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9:_-]+/g, '_');

    const [callRes, analysisRes, transferRes, callbackRes] = await Promise.all([
      supabase.from(call.tableName).select('*').eq(callCols.id, callId).maybeSingle(),
      supabase.from(callAnalysis.tableName).select('*').eq(caCols.call_id, callId).maybeSingle(),
      supabase.from(callTransfer.tableName).select('*').eq(trCols.call_id, callId).order(trCols.transfer_time, { ascending: false }).limit(1).maybeSingle(),
      supabase.from(callbackLog.tableName).select(cbCols.id).eq(cbCols.call_id, callId).limit(1)
    ]);

    const callRow = callRes.data || null;
    const analysisRow = analysisRes.data || null;
    const transferRow = transferRes.data || null;
    const hasCallback = !!(callbackRes.data && callbackRes.data.length > 0);

    const set = new Set();
    const category = analysisRow ? analysisRow[caCols.category] : null;
    if (category) set.add(`category:${normalized(category)}`);
    const intent = callRow ? callRow[callCols.detected_intent] : null;
    if (intent && !category) set.add(`category:${normalized(intent)}`);

    if (transferRow) {
      const dept = transferRow[trCols.department];
      if (dept) set.add(`department:${normalized(dept)}`);
      if (transferRow[trCols.success] === true) set.add('transfer_success');
      else if (transferRow[trCols.success] === false) set.add('transfer_failed');
    } else {
      if (callRow && callRow[callCols.transferred]) set.add('transfer_attempted');
      else set.add('no_transfer');
    }

    if ((callRow && callRow[callCols.callback_requested]) || hasCallback) set.add('callback_requested');
    else set.add('no_callback');

    const outcome = callRow ? callRow[callCols.outcome_code] : null;
    if (outcome) set.add(normalized(outcome));

    // "no" only when absolutely nothing meaningful exists.
    if (set.size === 0) set.add('no');

    const synthetic = Array.from(set)
      .filter(Boolean)
      .map((tag, i) => ({ id: `synthetic-${i + 1}`, call_id: callId, tag }));
    return res.json(synthetic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createCallTag,
  getCallTags
};


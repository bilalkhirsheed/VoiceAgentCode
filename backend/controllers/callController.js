const supabase = require('../config/supabaseClient');
const { call, dealer, callAnalysis, callTransfer } = require('../models');
const { randomUUID } = require('crypto');

function deriveOutcomeCode(callRow, analysisRow, cols, caCols) {
  const direct = callRow[cols.outcome_code];
  if (direct) return direct;
  if (callRow[cols.transfer_success] === true) return 'transferred';
  if (callRow[cols.transfer_success] === false) return 'transfer_failed_callback';
  if (callRow[cols.callback_requested] === true) return 'callback_captured';
  if (analysisRow) {
    if (analysisRow[caCols.call_back_capture]) return 'callback_captured';
    if (analysisRow[caCols.call_successful] === true) return 'resolved_by_ai';
    if (analysisRow[caCols.call_successful] === false) return 'abandoned';
  }
  // Call ended but no provider outcome landed; show a meaningful fallback.
  if (callRow[cols.end_time]) return 'completed';
  return null;
}

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

// GET /api/calls — returns calls with dealer_name and analysis-backed caller/intent/outcome for CRM display
async function getCalls(req, res) {
  try {
    const callTable = call.tableName;
    const cols = call.columns;
    const dealerTable = dealer.tableName;
    const dealerCols = dealer.columns;
    const caTable = callAnalysis.tableName;
    const caCols = callAnalysis.columns;

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

    const { data: calls, error } = await query.order(cols.start_time, { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    if (!calls || calls.length === 0) {
      return res.json([]);
    }

    const dealerIds = [...new Set(calls.map((c) => c[cols.dealer_id]).filter(Boolean))];
    const callIds = calls.map((c) => c.id);

    const [dealersRes, analysisRes] = await Promise.all([
      dealerIds.length > 0
        ? supabase.from(dealerTable).select(`${dealerCols.id}, ${dealerCols.dealer_name}`).in(dealerCols.id, dealerIds)
        : { data: [] },
      supabase.from(caTable).select(`${caCols.call_id}, ${caCols.customer_phone}, ${caCols.category}, ${caCols.call_back_capture}, ${caCols.call_successful}`).in(caCols.call_id, callIds)
    ]);

    const dealersById = {};
    (dealersRes.data || []).forEach((d) => { dealersById[d[dealerCols.id]] = d[dealerCols.dealer_name]; });
    const analysisByCallId = {};
    (analysisRes.data || []).forEach((a) => { analysisByCallId[a[caCols.call_id]] = a; });

    const merged = calls.map((c) => {
      const a = analysisByCallId[c.id];
      const outcomeCode = deriveOutcomeCode(c, a, cols, caCols);
      return {
        ...c,
        dealer_name: c[cols.dealer_id] ? dealersById[c[cols.dealer_id]] || null : null,
        caller_number: c[cols.caller_number] || (a && a[caCols.customer_phone]) || null,
        detected_intent: c[cols.detected_intent] || (a && a[caCols.category]) || null,
        outcome_code: outcomeCode || 'no_outcome'
      };
    });

    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/calls/:id — returns one call with dealer_name and analysis-backed caller/intent/outcome
async function getCallById(req, res) {
  try {
    let id = req.params.id;
    const callTable = call.tableName;
    const cols = call.columns;
    const dealerTable = dealer.tableName;
    const dealerCols = dealer.columns;
    const caTable = callAnalysis.tableName;
    const caCols = callAnalysis.columns;
    const transferTable = callTransfer.tableName;
    const transferCols = callTransfer.columns;

    const { data, error } = await supabase
      .from(callTable)
      .select('*')
      .eq(cols.id, id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }
    let callRow = data;

    // Backward-compatibility: if frontend accidentally passes numeric transfer row id
    // (e.g. /crm/calls/1), resolve it to the real Retell call_id from call_transfers.
    if (!callRow && /^\d+$/.test(String(id))) {
      const { data: transferRow, error: transferErr } = await supabase
        .from(transferTable)
        .select('*')
        .eq(transferCols.id, id)
        .maybeSingle();
      if (transferErr) {
        return res.status(500).json({ error: transferErr.message });
      }
      if (transferRow && transferRow[transferCols.call_id]) {
        id = transferRow[transferCols.call_id];
        const resolved = await supabase
          .from(callTable)
          .select('*')
          .eq(cols.id, id)
          .maybeSingle();
        if (resolved.error) {
          return res.status(500).json({ error: resolved.error.message });
        }
        callRow = resolved.data || null;
      }
    }

    if (!callRow) {
      return res.status(404).json({ error: 'Call not found' });
    }

    let dealerName = null;
    if (callRow[cols.dealer_id]) {
      const { data: d } = await supabase.from(dealerTable).select(dealerCols.dealer_name).eq(dealerCols.id, callRow[cols.dealer_id]).maybeSingle();
      if (d) dealerName = d[dealerCols.dealer_name];
    }
    const { data: analysis } = await supabase
      .from(caTable)
      .select(
        `${caCols.customer_name}, ${caCols.customer_phone}, ${caCols.customer_email}, ${caCols.category}, ${caCols.call_summary}, ${caCols.call_back_capture}, ${caCols.call_successful}`
      )
      .eq(caCols.call_id, id)
      .maybeSingle();
    const outcomeCode = deriveOutcomeCode(callRow, analysis, cols, caCols);

    res.json({
      ...callRow,
      dealer_name: dealerName,
      caller_number: callRow[cols.caller_number] || (analysis && analysis[caCols.customer_phone]) || null,
      detected_intent: callRow[cols.detected_intent] || (analysis && analysis[caCols.category]) || null,
      outcome_code: outcomeCode || 'no_outcome',
      customer_name: analysis ? analysis[caCols.customer_name] || null : null,
      customer_phone: analysis ? analysis[caCols.customer_phone] || null : null,
      customer_email: analysis ? analysis[caCols.customer_email] || null : null,
      call_summary: analysis ? analysis[caCols.call_summary] || null : null,
      category: analysis ? analysis[caCols.category] || null : null
    });
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


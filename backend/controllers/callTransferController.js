const supabase = require('../config/supabaseClient');
const { callTransfer, call, dealer, callAnalysis } = require('../models');
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

// GET /api/transfers — list transfer rows enriched with call/dealer fields
async function getAllTransfers(req, res) {
  try {
    const table = callTransfer.tableName;
    const cols = callTransfer.columns;
    const callTable = call.tableName;
    const callCols = call.columns;
    const dealerTable = dealer.tableName;
    const dealerCols = dealer.columns;
    const analysisTable = callAnalysis.tableName;
    const analysisCols = callAnalysis.columns;

    let transferQuery = supabase
      .from(table)
      .select('*')
      .order(cols.transfer_time, { ascending: false });

    const { data: transferRows, error: transferError } = await transferQuery;
    if (transferError) {
      return res.status(500).json({ error: transferError.message });
    }

    if (!transferRows || transferRows.length === 0) {
      return res.json([]);
    }

    const callIds = [...new Set(transferRows.map((r) => r[cols.call_id]).filter(Boolean))];
    const { data: callRows, error: callError } = await supabase
      .from(callTable)
      .select('*')
      .in(callCols.id, callIds);
    if (callError) {
      return res.status(500).json({ error: callError.message });
    }

    const { data: analysisRows, error: analysisError } = await supabase
      .from(analysisTable)
      .select('*')
      .in(analysisCols.call_id, callIds);
    if (analysisError) {
      return res.status(500).json({ error: analysisError.message });
    }

    const callsById = {};
    (callRows || []).forEach((c) => {
      callsById[c[callCols.id]] = c;
    });
    const analysisByCallId = {};
    (analysisRows || []).forEach((a) => {
      analysisByCallId[a[analysisCols.call_id]] = a;
    });

    const dealerIds = [
      ...new Set((callRows || []).map((c) => c[callCols.dealer_id]).filter(Boolean))
    ];
    let dealersById = {};
    if (dealerIds.length > 0) {
      const { data: dealerRows, error: dealerError } = await supabase
        .from(dealerTable)
        .select(`${dealerCols.id}, ${dealerCols.dealer_name}`)
        .in(dealerCols.id, dealerIds);
      if (dealerError) {
        return res.status(500).json({ error: dealerError.message });
      }
      dealersById = (dealerRows || []).reduce((acc, d) => {
        acc[d[dealerCols.id]] = d[dealerCols.dealer_name];
        return acc;
      }, {});
    }

    const response = transferRows.map((t) => {
      const callRow = callsById[t[cols.call_id]] || null;
      const analysisRow = analysisByCallId[t[cols.call_id]] || null;
      const dealerId = callRow ? callRow[callCols.dealer_id] : null;
      return {
        ...t,
        dealer_id: dealerId || null,
        dealer_name: dealerId ? dealersById[dealerId] || null : null,
        caller_number: callRow ? callRow[callCols.caller_number] || null : null,
        did: callRow ? callRow[callCols.did] || null : null,
        start_time: callRow ? callRow[callCols.start_time] || null : null,
        end_time: callRow ? callRow[callCols.end_time] || null : null,
        outcome_code: callRow ? callRow[callCols.outcome_code] || null : null,
        transfer_success: t[cols.success],
        customer_name: analysisRow ? analysisRow[analysisCols.customer_name] || null : null,
        customer_phone: analysisRow ? analysisRow[analysisCols.customer_phone] || null : null,
        customer_email: analysisRow ? analysisRow[analysisCols.customer_email] || null : null,
        category: analysisRow ? analysisRow[analysisCols.category] || null : null,
        call_summary: analysisRow ? analysisRow[analysisCols.call_summary] || null : null,
        recording_url: analysisRow ? analysisRow[analysisCols.recording_url] || null : null,
        public_log_url: analysisRow ? analysisRow[analysisCols.public_log_url] || null : null
      };
    });

    let filtered = response;
    if (req.query.dealer_id) {
      filtered = filtered.filter((r) => String(r.dealer_id) === String(req.query.dealer_id));
    }

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createCallTransfer,
  getCallTransfers,
  getAllTransfers
};


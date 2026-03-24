const supabase = require('../config/supabaseClient');
const { dealer, call, callAnalysis, serviceAppointment } = require('../models');

function isTransientUpstreamError(message) {
  const m = String(message || '').toLowerCase();
  return (
    m.includes('fetch failed') ||
    m.includes('bad gateway') ||
    m.includes('error code 502') ||
    m.includes('cloudflare') ||
    m.includes('gateway')
  );
}

async function maybeSingleWithRetry(queryFactory, attempts = 3) {
  let lastError = null;
  for (let i = 0; i < attempts; i += 1) {
    // queryFactory must return a fresh Supabase query each attempt.
    const { data, error } = await queryFactory();
    if (!error) return { data, error: null };
    lastError = error;
    if (!isTransientUpstreamError(error.message)) break;
    if (i < attempts - 1) {
      // short backoff to tolerate transient Supabase/Cloudflare blips
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
    }
  }
  return { data: null, error: lastError };
}

async function findDealerByPrimaryPhone(primaryPhone) {
  const dealerTable = dealer.tableName;
  const dealerCols = dealer.columns;
  const raw = (primaryPhone || '').trim();
  if (!raw) return null;

  const variants = [raw, raw.startsWith('+') ? raw : `+${raw}`, raw.replace(/^\+/, '')];
  let dealerRow = null;

  for (const phone of [...new Set(variants)]) {
    const { data, error } = await maybeSingleWithRetry(
      () =>
        supabase
          .from(dealerTable)
          .select('*')
          .eq(dealerCols.primary_phone, phone)
          .maybeSingle(),
      3
    );

    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      dealerRow = data;
      break;
    }
  }

  return dealerRow;
}

// GET /api/dealer-dashboard?dealer_phone=...
async function getDealerDashboard(req, res) {
  try {
    const { dealer_phone } = req.query;
    if (!dealer_phone) {
      return res.status(400).json({ error: 'dealer_phone is required' });
    }

    const dealerRow = await findDealerByPrimaryPhone(dealer_phone);
    if (!dealerRow) {
      return res.status(404).json({ error: 'Dealer not found for this phone number' });
    }

    const dealerCols = dealer.columns;
    const dealerId = dealerRow[dealerCols.id];
    const dealerName = dealerRow[dealerCols.dealer_name];
    const normalizedDealerPhone = dealerRow[dealerCols.primary_phone];

    const callTable = call.tableName;
    const callCols = call.columns;
    const caTable = callAnalysis.tableName;
    const caCols = callAnalysis.columns;
    const saTable = serviceAppointment.tableName;
    const saCols = serviceAppointment.columns;

    // Fetch analysis rows by dealer_id (primary) with a fallback by DID (`calls.did`).
    // This prevents an empty dashboard if historical `calls.dealer_id` values don't match `dealers.id`
    // (for example after manual dealer edits / data migrations).
    const didVariants = [...new Set([
      normalizedDealerPhone,
      normalizedDealerPhone.startsWith('+') ? normalizedDealerPhone : `+${normalizedDealerPhone}`,
      normalizedDealerPhone.replace(/^\+/, '')
    ])].filter(Boolean);

    const [callsForAnalysisByDealerIdRes, callsForAnalysisByDidRes] = await Promise.all([
      supabase
        .from(callTable)
        .select(`${callCols.id}, ${callCols.start_time}`)
        .eq(callCols.dealer_id, String(dealerId))
        .order(callCols.start_time, { ascending: false })
        .limit(500),
      supabase
        .from(callTable)
        .select(`${callCols.id}, ${callCols.start_time}`)
        .in(callCols.did, didVariants)
        .order(callCols.start_time, { ascending: false })
        .limit(500)
    ]);

    if (callsForAnalysisByDealerIdRes.error) throw new Error(callsForAnalysisByDealerIdRes.error.message);
    if (callsForAnalysisByDidRes.error) throw new Error(callsForAnalysisByDidRes.error.message);

    const mergedCallsForAnalysisById = new Map();
    for (const r of [...(callsForAnalysisByDealerIdRes.data || []), ...(callsForAnalysisByDidRes.data || [])]) {
      const id = r?.[callCols.id];
      if (!id) continue;
      mergedCallsForAnalysisById.set(id, r);
    }

    const callIdsForAnalysis = [...mergedCallsForAnalysisById.values()]
      .sort((a, b) => new Date(b?.[callCols.start_time] || 0) - new Date(a?.[callCols.start_time] || 0))
      .slice(0, 500)
      .map((r) => r[callCols.id])
      .filter(Boolean);

    let analysisRes = { data: [] };
    if (callIdsForAnalysis.length > 0) {
      analysisRes = await supabase
        .from(caTable)
        .select('*')
        .in(caCols.call_id, callIdsForAnalysis)
        .order(caCols.created_at, { ascending: false });
      if (analysisRes.error) throw new Error(analysisRes.error.message);
    }

    // Fetch appointments + raw recent calls
    const [apptByIdRes, apptByPhoneRes, callsResByDealerId, callsResByDid] = await Promise.all([
      supabase
        .from(saTable)
        .select('*')
        .eq(saCols.dealer_id, String(dealerId))
        .order(saCols.created_at, { ascending: false })
        .limit(50),
      supabase
        .from(saTable)
        .select('*')
        .eq(saCols.dealer_phone, normalizedDealerPhone)
        .order(saCols.created_at, { ascending: false })
        .limit(50),
      supabase
        .from(callTable)
        .select(callCols.id, callCols.start_time, callCols.caller_number, callCols.detected_intent, callCols.outcome_code)
        .eq(callCols.dealer_id, String(dealerId))
        .order(callCols.start_time, { ascending: false })
        .limit(80),
      supabase
        .from(callTable)
        .select(callCols.id, callCols.start_time, callCols.caller_number, callCols.detected_intent, callCols.outcome_code)
        .in(callCols.did, didVariants)
        .order(callCols.start_time, { ascending: false })
        .limit(80)
    ]);

    if (apptByIdRes.error) throw new Error(apptByIdRes.error.message);
    if (apptByPhoneRes.error) throw new Error(apptByPhoneRes.error.message);
    if (callsResByDealerId.error) throw new Error(callsResByDealerId.error.message);
    if (callsResByDid.error) throw new Error(callsResByDid.error.message);

    const analysisRows = analysisRes.data || [];
    const apptById = apptByIdRes.data || [];
    const apptByPhone = apptByPhoneRes.data || [];
    const apptRows = [...apptById];
    const seenApptIds = new Set(apptRows.map((r) => r[saCols.id]));
    apptByPhone.forEach((r) => {
      if (!seenApptIds.has(r[saCols.id])) {
        apptRows.push(r);
        seenApptIds.add(r[saCols.id]);
      }
    });
    apptRows.sort((a, b) => new Date(b[saCols.created_at] || 0) - new Date(a[saCols.created_at] || 0));

    const mergedRecentCallsById = new Map();
    for (const r of [...(callsResByDealerId.data || []), ...(callsResByDid.data || [])]) {
      const id = r?.[callCols.id];
      if (!id) continue;
      mergedRecentCallsById.set(id, r);
    }

    const recentCallRows = [...mergedRecentCallsById.values()]
      .sort((a, b) => new Date(b?.[callCols.start_time] || 0) - new Date(a?.[callCols.start_time] || 0))
      .slice(0, 80);

    function filterCategory(cat) {
      return analysisRows.filter((row) => (row[caCols.category] || '').toLowerCase() === cat);
    }

    const buildList = (rows) =>
      rows.map((row) => ({
        call_id: row[caCols.call_id],
        customer_name: row[caCols.customer_name],
        customer_phone: row[caCols.customer_phone],
        customer_email: row[caCols.customer_email],
        vehicle_make: row[caCols.vehicle_make],
        vehicle_model: row[caCols.vehicle_model],
        vehicle_year: row[caCols.vehicle_year],
        service_request: row[caCols.service_request],
        call_summary: row[caCols.call_summary],
        user_sentiment: row[caCols.user_sentiment],
        call_successful: row[caCols.call_successful],
        category: row[caCols.category],
        is_user_hangup: row[caCols.is_user_hangup],
        disconnection_reason: row[caCols.disconnection_reason],
        recording_url: row[caCols.recording_url],
        public_log_url: row[caCols.public_log_url],
        created_at: row[caCols.created_at]
      }));

    const salesRows = filterCategory('sales');
    const serviceRows = filterCategory('service');
    const partsRows = filterCategory('parts');
    const callbackRows = filterCategory('callback');
    const hangupRows = analysisRows.filter((row) => row[caCols.is_user_hangup]);

    const buildApptList = (rows) =>
      rows.map((row) => ({
        id: row[saCols.id],
        customer_name: row[saCols.customer_name],
        customer_phone: row[saCols.customer_phone],
        customer_email: row[saCols.customer_email],
        vehicle_make: row[saCols.vehicle_make],
        vehicle_model: row[saCols.vehicle_model],
        vehicle_year: row[saCols.vehicle_year],
        service_request: row[saCols.service_request],
        preferred_date: row[saCols.preferred_date],
        preferred_time: row[saCols.preferred_time],
        start_time_local: row[saCols.start_time_local],
        end_time_local: row[saCols.end_time_local],
        local_timezone: row[saCols.local_timezone],
        calendar_html_link: row[saCols.calendar_html_link],
        created_at: row[saCols.created_at]
      }));

    return res.json({
      dealer_name: dealerName,
      dealer_phone: normalizedDealerPhone,
      sales: {
        count: salesRows.length,
        latest: buildList(salesRows)
      },
      service: {
        count: serviceRows.length,
        latest: buildList(serviceRows)
      },
      parts: {
        count: partsRows.length,
        latest: buildList(partsRows)
      },
      callbacks: {
        count: callbackRows.length,
        latest: buildList(callbackRows)
      },
      user_hangups: {
        count: hangupRows.length,
        latest: buildList(hangupRows)
      },
      recent_calls: (() => {
        const analysisByCallId = {};
        analysisRows.forEach((a) => { analysisByCallId[a[caCols.call_id]] = a; });
        return recentCallRows.map((row) => {
          const a = analysisByCallId[row[callCols.id]];
          return {
            call_id: row[callCols.id],
            customer_name: (a && a[caCols.customer_name]) || null,
            customer_phone: row[callCols.caller_number] || (a && a[caCols.customer_phone]) || null,
            service_request: (a && a[caCols.service_request]) || null,
            call_summary: (a && a[caCols.call_summary]) || null,
            category: (a && a[caCols.category]) || row[callCols.detected_intent] || 'other',
            call_successful: a ? a[caCols.call_successful] : null,
            created_at: row[callCols.start_time] || (a && a[caCols.created_at]) || null
          };
        });
      })(),
      service_appointments: {
        count: apptRows.length,
        latest: buildApptList(apptRows)
      }
    });
  } catch (err) {
    console.error('getDealerDashboard error:', err);
    return res.status(500).json({ error: 'Failed to load dealer dashboard' });
  }
}

module.exports = {
  getDealerDashboard
};


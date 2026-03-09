const supabase = require('../config/supabaseClient');
const {
  dealer,
  call,
  callEvent,
  callTranscript,
  callTransfer,
  callbackLog
} = require('../models');

// Utility: find dealer_id from DID (primary_phone)
async function findDealerIdByDid(didRaw) {
  const dealerTable = dealer.tableName;
  const dealerCols = dealer.columns;

  const did = decodeURIComponent(didRaw || '');
  const variants = [did, did.startsWith('+') ? did : `+${did}`, did.replace(/^\+/, '')];
  for (const phone of [...new Set(variants)]) {
    const { data, error } = await supabase
      .from(dealerTable)
      .select('*')
      .eq(dealerCols.primary_phone, phone)
      .maybeSingle();

    if (error) throw error;
    if (data) return data[dealerCols.id];
  }
  return null;
}

async function handleCallStarted(payload) {
  const callTable = call.tableName;
  const cols = call.columns;

  const callId = payload.call_id;
  // Avoid duplicates if retried
  const existing = await supabase
    .from(callTable)
    .select('*')
    .eq(cols.id, callId)
    .maybeSingle();
  if (existing.data) return;

  const dealerId =
    payload.dealer_id ||
    (payload.to_number ? await findDealerIdByDid(payload.to_number) : null);

  const insertPayload = {
    [cols.id]: callId,
    [cols.dealer_id]: dealerId != null ? String(dealerId) : null,
    [cols.did]: payload.to_number || null,
    [cols.caller_number]: payload.from_number || null,
    [cols.start_time]: payload.start_time || payload.start_timestamp ? new Date(payload.start_time || payload.start_timestamp).toISOString() : new Date().toISOString(),
    [cols.outcome_code]: null,
    [cols.transferred]: false,
    [cols.callback_requested]: false
  };

  const { error } = await supabase.from(callTable).insert([insertPayload]);
  if (error) throw error;
}

async function handleTranscript(payload) {
  const table = callTranscript.tableName;
  const cols = callTranscript.columns;

  const insertPayload = {
    [cols.call_id]: payload.call_id,
    [cols.speaker]: payload.speaker || 'user',
    [cols.message]: payload.text || '',
    [cols.timestamp]: payload.timestamp ? new Date(payload.timestamp).toISOString() : new Date().toISOString()
  };

  const { error } = await supabase.from(table).insert([insertPayload]);
  if (error) throw error;
}

async function handleIntentDetected(payload) {
  const callTable = call.tableName;
  const cols = call.columns;
  const intent = payload.intent || payload.detected_intent || null;
  if (!intent) return;

  // Update calls.detected_intent
  const { error: updateError } = await supabase
    .from(callTable)
    .update({ [cols.detected_intent]: intent })
    .eq(cols.id, payload.call_id);
  if (updateError) throw updateError;
}

async function handleTransferAttempt(payload) {
  const table = callTransfer.tableName;
  const cols = callTransfer.columns;

  const insertPayload = {
    [cols.call_id]: payload.call_id,
    [cols.department]: payload.department || null,
    [cols.target_number]: payload.target_number || null,
    [cols.transfer_time]: payload.timestamp ? new Date(payload.timestamp).toISOString() : new Date().toISOString(),
    [cols.success]: null,
    [cols.failure_reason]: null
  };

  const { error } = await supabase.from(table).insert([insertPayload]);
  if (error) throw error;
}

async function handleTransferResult(payload, success) {
  const table = callTransfer.tableName;
  const cols = callTransfer.columns;
  const callTable = call.tableName;
  const ccols = call.columns;
  const eventsTable = callEvent.tableName;
  const ecols = callEvent.columns;

  // Update last transfer row for this call (simplest: latest transfer_time)
  const { data: transfers, error: listError } = await supabase
    .from(table)
    .select('*')
    .eq(cols.call_id, payload.call_id)
    .order(cols.transfer_time, { ascending: false })
    .limit(1);
  if (listError) throw listError;

  if (transfers && transfers.length > 0) {
    const last = transfers[0];
    const updatePayload = {
      [cols.success]: success,
      [cols.failure_reason]: success ? null : payload.reason || payload.failure_reason || null
    };
    const { error: updError } = await supabase
      .from(table)
      .update(updatePayload)
      .eq(cols.id, last[cols.id]);
    if (updError) throw updError;
  }

  // Update call header flags
  const callUpdate = {
    [ccols.transferred]: success || !!payload.reason,
    [ccols.transfer_target]: payload.target_number || null,
    [ccols.transfer_success]: success
  };

  const { error: callError } = await supabase
    .from(callTable)
    .update(callUpdate)
    .eq(ccols.id, payload.call_id);
  if (callError) throw callError;
}


async function handleCallEnded(payload) {
  const callTable = call.tableName;
  const cols = call.columns;

  // 1) Compute end_time (prefer Retell's end_timestamp)
  const endStr =
    payload.end_timestamp ||
    payload.end_time ||
    payload.ended_at ||
    payload.timestamp ||
    null;
  const endTimeIso = endStr ? new Date(endStr).toISOString() : new Date().toISOString();

  // 2) Compute duration_seconds
  let durationSeconds = null;

  if (payload.duration_seconds != null) {
    durationSeconds = payload.duration_seconds;
  } else if (payload.duration_ms != null) {
    durationSeconds = Math.round(payload.duration_ms / 1000);
  }

  if (durationSeconds == null) {
    let startStr = payload.start_timestamp || payload.start_time || null;

    // If start not present in payload, read from existing call row
    if (!startStr) {
      const { data: row, error: rowError } = await supabase
        .from(callTable)
        .select(cols.start_time)
        .eq(cols.id, payload.call_id)
        .maybeSingle();
      if (!rowError && row && row[cols.start_time]) {
        startStr = row[cols.start_time];
      }
    }

    if (startStr) {
      const start = new Date(startStr);
      const end = new Date(endTimeIso);
      const diffMs = end - start;
      if (Number.isFinite(diffMs) && diffMs >= 0) {
        durationSeconds = Math.round(diffMs / 1000);
      }
    }
  }

  const update = {
    [cols.end_time]: endTimeIso,
    [cols.duration_seconds]: durationSeconds,
    [cols.recording_url]:
      payload.recording_url || payload.recording_url_s3 || payload.recording || null
  };

  const { error } = await supabase
    .from(callTable)
    .update(update)
    .eq(cols.id, payload.call_id);
  if (error) throw error;

  // 3) Persist final transcript (if present) into call_transcripts
  const transcriptText =
    // 1) Prefer the clean text transcript field
    payload.transcript ||
    // 2) Build from transcript_object if available
    (Array.isArray(payload.transcript_object)
      ? payload.transcript_object
          .map((item) => {
            const role = item.role || 'system';
            const speaker =
              role === 'agent' ? 'Agent' : role === 'user' ? 'User' : role;
            const text = item.content || '';
            return text ? `${speaker}: ${text}` : '';
          })
          .filter(Boolean)
          .join('\n')
      : null) ||
    // 3) Fallback: derive from transcript_with_tool_calls (only agent/user roles)
    (Array.isArray(payload.transcript_with_tool_calls)
      ? payload.transcript_with_tool_calls
          .filter((item) => item.role === 'agent' || item.role === 'user')
          .map((item) => {
            const speaker = item.role === 'agent' ? 'Agent' : 'User';
            const text = item.content || '';
            return text ? `${speaker}: ${text}` : '';
          })
          .filter(Boolean)
          .join('\n')
      : null) ||
    // 4) Optional: analysis transcript if present
    (payload.call_analysis && payload.call_analysis.transcript) ||
    null;

  if (transcriptText) {
    const table = callTranscript.tableName;
    const tcols = callTranscript.columns;

    const insertPayload = {
      [tcols.call_id]: payload.call_id,
      [tcols.speaker]: 'system',
      [tcols.message]: transcriptText,
      [tcols.timestamp]: endTimeIso
    };

    const { error: tError } = await supabase.from(table).insert([insertPayload]);
    if (tError) throw tError;
  }
}

async function handleCallSummary(payload) {
  const callTable = call.tableName;
  const cols = call.columns;

  const outcome = payload.outcome || payload.outcome_code || null;
  const detectedIntent = payload.intent || payload.detected_intent || null;

  const update = {};
  if (outcome) update[cols.outcome_code] = outcome;
  if (detectedIntent) update[cols.detected_intent] = detectedIntent;

  if (Object.keys(update).length === 0) return;

  const { error } = await supabase
    .from(callTable)
    .update(update)
    .eq(cols.id, payload.call_id);
  if (error) throw error;
}

async function handleCallbackCapturedFromFunction(payload) {
  // Example for custom function events from Retell:
  // { event: 'function_call', call_id, function_name, arguments: { customer_name, phone_number, preferred_time } }
  if (!payload.function_name) return;

  const fn = payload.function_name;
  if (!/callback/i.test(fn)) return;

  const args = payload.arguments || {};
  const table = callbackLog.tableName;
  const cols = callbackLog.columns;

  const insertPayload = {
    [cols.call_id]: payload.call_id,
    [cols.customer_name]: args.customer_name || null,
    [cols.phone_number]: args.phone_number || args.customer_phone || null,
    [cols.preferred_time]: args.preferred_time || null
  };

  const { error } = await supabase.from(table).insert([insertPayload]);
  if (error) throw error;
}

// Unified webhook handler
async function handleRetellWebhook(req, res) {
  const eventType = req.body.event || req.body.type;
  const payload = req.body.call || req.body;

  if (!eventType || !payload.call_id) {
    console.log('Invalid Retell webhook payload:', req.body);
    return res.status(400).json({ error: 'Missing event or call_id' });
    
  }

  try {
    // Ensure call exists in calls table
    const callTable = call.tableName;
    const ccols = call.columns;
    const existingCall = await supabase
      .from(callTable)
      .select('*')
      .eq(ccols.id, payload.call_id)
      .maybeSingle();
    if (!existingCall.data) {
      // Insert minimal call record
      const insertPayload = {
        [ccols.id]: payload.call_id,
        [ccols.start_time]: payload.start_timestamp ? new Date(payload.start_timestamp).toISOString() : new Date().toISOString(),
        [ccols.did]: null,
        [ccols.caller_number]: null,
        [ccols.outcome_code]: null,
        [ccols.transferred]: false,
        [ccols.callback_requested]: false
      };
      const { error: insertError } = await supabase.from(callTable).insert([insertPayload]);
      if (insertError) throw insertError;
    }

    // Always save the event to call_events
    const eventsTable = callEvent.tableName;
    const ecols = callEvent.columns;
    const { error: evError } = await supabase.from(eventsTable).insert([
      {
        [ecols.call_id]: payload.call_id,
        [ecols.event_type]: eventType,
        [ecols.event_time]: (payload.timestamp || payload.event_timestamp) ? new Date(payload.timestamp || payload.event_timestamp).toISOString() : new Date().toISOString(),
        [ecols.node_name]: payload.node_name || null,
        [ecols.intent_detected]: payload.intent || null,
        [ecols.metadata]: payload
      }
    ]);
    if (evError) throw evError;

    switch (eventType) {
      case 'call_started':
        await handleCallStarted(payload);
        break;
      case 'transcript':
      case 'user_transcript':
      case 'assistant_transcript':
        await handleTranscript(
          eventType === 'transcript'
            ? payload
            : {
                ...payload,
                speaker: eventType === 'user_transcript' ? 'user' : 'assistant',
                text: payload.text || payload.transcript
              }
        );
        break;
      case 'transcript_updated':
        if (payload.transcript_object && Array.isArray(payload.transcript_object)) {
          for (const item of payload.transcript_object) {
            await handleTranscript({
              call_id: payload.call_id,
              speaker: item.speaker || item.role || 'unknown',
              text: item.text || item.content || '',
              timestamp: item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString()
            });
          }
        } else {
          console.log('transcript_updated without transcript_object:', payload);
        }
        break;
      case 'intent_detected':
        await handleIntentDetected(payload);
        break;
      case 'call_transfer_attempt':
        await handleTransferAttempt(payload);
        break;
      case 'call_transfer_success':
        await handleTransferResult(payload, true);
        break;
      case 'call_transfer_failed':
        await handleTransferResult(payload, false);
        break;
      case 'call_ended':
        await handleCallEnded(payload);
        break;
      case 'call_summary':
        await handleCallSummary(payload);
        break;
      case 'function_call':
        await handleCallbackCapturedFromFunction(payload);
        break;
      default:
        // Unknown events are already saved by the general insert above
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error handling Retell webhook:', err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  handleRetellWebhook
};


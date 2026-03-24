const supabase = require('../config/supabaseClient');
const {
  dealer,
  call,
  callEvent,
  callTranscript,
  callTransfer,
  callbackLog,
  callTag,
  department,
  callAnalysis
} = require('../models');
const emailService = require('../services/emailService');

// Utility: find dealer_id from DID (primary_phone in dealers table)
async function findDealerIdByDid(didRaw) {
  const dealerTable = dealer.tableName;
  const dealerCols = dealer.columns;

  const did = decodeURIComponent(didRaw || '');
  const normalizeVariants = (s) => {
    const v = String(s ?? '').trim();
    if (!v) return [];
    const withPlus = v.startsWith('+') ? v : `+${v}`;
    const withoutPlus = v.replace(/^\+/, '');
    return [v, withPlus, withoutPlus];
  };

  // IMPORTANT: inbound DID is stored in `dealers.inbound_did` in your DB.
  // Some setups may also store the same value in `primary_phone`,
  // so we check both columns.
  const variants = normalizeVariants(did);
  for (const phone of [...new Set(variants)]) {
    // 1) Try inbound DID mapping
    if (dealerCols.inbound_did) {
      const { data, error } = await supabase
        .from(dealerTable)
        .select('*')
        .eq(dealerCols.inbound_did, phone)
        .maybeSingle();

      if (error) throw error;
      if (data) return data[dealerCols.id];
    }

    // 2) Fallback: primary phone mapping
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

async function claimEmailDispatch({ callId, dispatchType, metadata = {} }) {
  if (!callId || !dispatchType) return false;
  const evTable = callEvent.tableName;
  const evCols = callEvent.columns;
  const eventType = `email_${dispatchType}`;

  const { data: existingRows, error: existingError } = await supabase
    .from(evTable)
    .select(evCols.id)
    .eq(evCols.call_id, callId)
    .eq(evCols.event_type, eventType)
    .limit(1);
  if (existingError) {
    console.error('[Email][Dedup] lookup failed:', existingError);
    return false;
  }
  if (existingRows && existingRows.length > 0) {
    return false;
  }

  const { error: insertErr } = await supabase.from(evTable).insert([
    {
      [evCols.call_id]: callId,
      [evCols.event_type]: eventType,
      [evCols.event_time]: new Date().toISOString(),
      [evCols.node_name]: null,
      [evCols.intent_detected]: null,
      [evCols.metadata]: metadata
    }
  ]);
  if (insertErr) {
    console.error('[Email][Dedup] claim insert failed:', insertErr);
    return false;
  }
  return true;
}

// Resolve dealer_id for an inbound call: Retell/Twilio number (to_number) → dealer.
// 1) Env RETELL_INBOUND_MAP e.g. "+14374940150:1,+1234567890:2" (phone:dealer_id).
// 2) Env RETELL_INBOUND_NUMBER + RETELL_INBOUND_DEALER_ID (single number).
// 3) Fallback: find dealer by primary_phone (when dealer's number is used as DID).
async function getDealerIdForInboundNumber(toNumber) {
  const raw = (toNumber || '').trim();
  if (!raw) return null;

  const normalized = raw.startsWith('+') ? raw : `+${raw}`;

  // Multiple numbers: RETELL_INBOUND_MAP=+14374940150:1,+1234567890:2
  const mapEnv = process.env.RETELL_INBOUND_MAP;
  if (mapEnv) {
    const entries = mapEnv.split(',').map((s) => s.trim()).filter(Boolean);
    for (const entry of entries) {
      const [phone, idStr] = entry.split(':').map((s) => s.trim());
      if (!phone || !idStr) continue;
      const phoneNorm = phone.startsWith('+') ? phone : `+${phone}`;
      if (phoneNorm === normalized) return parseInt(idStr, 10) || idStr;
    }
  }

  // Single number: RETELL_INBOUND_NUMBER and RETELL_INBOUND_DEALER_ID
  const envNumber = (process.env.RETELL_INBOUND_NUMBER || '').trim();
  const envId = process.env.RETELL_INBOUND_DEALER_ID;
  if (envNumber && envId != null && envId !== '') {
    const envNorm = envNumber.startsWith('+') ? envNumber : `+${envNumber}`;
    if (envNorm === normalized) return parseInt(envId, 10) || envId;
  }

  return findDealerIdByDid(toNumber);
}

// For web_call (browser widget): Retell does not send to_number/from_number. Use default dealer.
function getDefaultDealerIdForWebCall() {
  const id = process.env.RETELL_DEFAULT_DEALER_ID || process.env.RETELL_INBOUND_DEALER_ID;
  if (id == null || id === '') return null;
  return parseInt(id, 10) || id;
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

  let dealerId =
    payload.dealer_id != null && payload.dealer_id !== ''
      ? (parseInt(payload.dealer_id, 10) || payload.dealer_id)
      : (payload.to_number ? await getDealerIdForInboundNumber(payload.to_number) : null);
  // Web calls have no to_number; use default dealer so CRM still shows the call under a dealer
  if (dealerId == null && (payload.call_type === 'web_call' || !payload.to_number)) {
    dealerId = getDefaultDealerIdForWebCall();
  }

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
  const targetNumber =
    payload.target_number ||
    payload.to_number ||
    payload.toNumber ||
    payload.number ||
    payload.transfer_to ||
    payload.transfer_to_number ||
    payload.destination ||
    payload.transfer_destination ||
    payload.transfer_destination_number ||
    payload.target ||
    payload.transferTarget ||
    payload.collected_dynamic_variables?.sales_transfer_phone ||
    payload.collected_dynamic_variables?.service_transfer_phone ||
    payload.collected_dynamic_variables?.parts_transfer_phone ||
    null;

  console.log(
    '[Retell][TransferAttempt]',
    'call_id=',
    payload.call_id,
    'department=',
    payload.department || '(unknown)',
    'target=',
    targetNumber || '(missing)'
  );

  const insertPayload = {
    [cols.call_id]: payload.call_id,
    [cols.department]: payload.department || null,
    [cols.target_number]: targetNumber,
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
  const targetNumber =
    payload.target_number ||
    payload.to_number ||
    payload.toNumber ||
    payload.number ||
    payload.transfer_to ||
    payload.transfer_to_number ||
    payload.destination ||
    payload.transfer_destination ||
    payload.transfer_destination_number ||
    payload.target ||
    payload.transferTarget ||
    null;
  const failureReason =
    success
      ? null
      : payload.reason || payload.failure_reason || payload.status || payload.error || 'transfer_failed';

  console.log(
    '[Retell][TransferResult]',
    'call_id=',
    payload.call_id,
    'success=',
    success,
    'target=',
    targetNumber || '(missing)',
    'reason=',
    failureReason || '(none)'
  );

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
      [cols.failure_reason]: failureReason
    };
    if (targetNumber && !last[cols.target_number]) {
      updatePayload[cols.target_number] = targetNumber;
    }
    const { error: updError } = await supabase
      .from(table)
      .update(updatePayload)
      .eq(cols.id, last[cols.id]);
    if (updError) throw updError;
  } else {
    // Some providers may send result without an explicit transfer_started event.
    // Insert a fallback row so Transfers CRM page still has a record.
    const fallbackPayload = {
      [cols.call_id]: payload.call_id,
      [cols.department]: payload.department || null,
      [cols.target_number]: targetNumber,
      [cols.transfer_time]: payload.timestamp ? new Date(payload.timestamp).toISOString() : new Date().toISOString(),
      [cols.success]: success,
      [cols.failure_reason]: failureReason
    };
    const { error: insertErr } = await supabase.from(table).insert([fallbackPayload]);
    if (insertErr) throw insertErr;
  }

  const fallbackTarget = (transfers && transfers.length > 0)
    ? transfers[0][cols.target_number]
    : null;
  const finalTarget = targetNumber || fallbackTarget || null;

  // Update call header flags
  const callUpdate = {
    // Transfer was attempted if we are processing a transfer result event.
    [ccols.transferred]: true,
    [ccols.transfer_target]: finalTarget,
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

  // Keep User Hangups populated even when call_analyzed is delayed or absent.
  await upsertUserHangupFlag({
    callId: payload.call_id,
    disconnectionReason: payload.disconnection_reason
  });

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

function categorizeCallFromAnalysis(custom) {
  const sr = (custom.service_request || '').toLowerCase();
  const reason =
    (custom.Reason_for_call ||
      custom.Reason_for_Call_Back ||
      custom.reason_for_call_back ||
      custom.Reason_for_call_back ||
      '').toLowerCase();
  const vehicleType = (custom.vehicle_type || '').toLowerCase();
  const testDrive = (custom.test_drive || '').toLowerCase();
  const tradeIn = (custom.trade_in || '').toLowerCase();

  if (/service|maintenance|oil|repair|booking/.test(sr) || /service/.test(reason)) {
    return 'service';
  }
  if (
    /sale|buy|purchase|finance|test drive|test-drive/.test(sr) ||
    /sale|buy|purchase|new vehicle|used vehicle/.test(reason) ||
    /new|used|pre-owned|preowned/.test(vehicleType) ||
    /yes|true/.test(testDrive) ||
    /yes|true/.test(tradeIn)
  ) {
    return 'sales';
  }
  if (/part|spare|accessor/.test(sr) || /part|spare|accessor/.test(reason)) {
    return 'parts';
  }
  if (custom.Call_Back_Capture || /callback/.test(reason)) {
    return 'callback';
  }
  return 'other';
}

function pickFirstValue(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function normalizeCapturedPhone(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  // Keep + and digits. If no +, preserve original text (CRM may store local format intentionally).
  const compact = text.replace(/\s+/g, '');
  return compact;
}

async function findDepartmentRecipientByKey({ dealerId, deptKey }) {
  if (!dealerId || !deptKey) return { email: null, name: null };
  const key = String(deptKey || '').trim().toLowerCase();
  if (!['sales', 'service', 'parts'].includes(key)) return { email: null, name: null };

  const deptTable = department.tableName;
  const deptCols = department.columns;
  const pattern = `%${key}%`;

  const { data: deptRows, error } = await supabase
    .from(deptTable)
    .select(`${deptCols.department_name}, ${deptCols.contact_email}`)
    .eq(deptCols.dealer_id, dealerId)
    .ilike(deptCols.department_name, pattern);
  if (error) {
    console.warn('[Email][DepartmentLookup] query failed', {
      dealerId,
      deptKey: key,
      error: error.message || String(error)
    });
    return { email: null, name: null };
  }

  // Prefer rows with non-empty contact_email; this avoids falling back to dealer
  // when duplicate department rows exist and one of them has NULL email.
  const preferred = (deptRows || []).find((row) => {
    const raw = row?.[deptCols.contact_email];
    return typeof raw === 'string' && raw.trim().length > 0;
  });
  if (!preferred) return { email: null, name: null };

  return {
    email: preferred[deptCols.contact_email].trim(),
    name: preferred[deptCols.department_name] || null
  };
}

function extractCustomerFromCollected(collected = {}) {
  const capturedCustomerName = pickFirstValue(
    collected.customer_name,
    collected.customerName,
    collected.name
  );

  const capturedCustomerPhone = normalizeCapturedPhone(
    pickFirstValue(
      collected.customer_phone,
      collected.customerPhone,
      collected.phone_number,
      collected.phone
    )
  );

  const capturedCustomerEmail = pickFirstValue(
    collected.customer_Email,
    collected.customer_email,
    collected.email,
    collected.customerEmail
  );

  return {
    customerName: capturedCustomerName,
    customerPhone: capturedCustomerPhone,
    customerEmail: capturedCustomerEmail,

    // Persist key sales/service/parts fields as soon as Retell collects them.
    // This fixes cases where `call_analyzed` payload may not include collected_dynamic_variables again.
    vehicleType: pickFirstValue(collected.vehicle_type, collected.vehicleType),
    testDrive: pickFirstValue(collected.test_drive, collected.testDrive),
    tradeIn: pickFirstValue(collected.trade_in, collected.tradeIn),
    vehicleMake: pickFirstValue(collected.vehicle_make, collected.vehicleMake),
    vehicleModel: pickFirstValue(collected.vehicle_model, collected.vehicleModel),
    vehicleYear: pickFirstValue(collected.vehicle_year, collected.vehicleYear),
    // Store any request detail into call_analysis.service_request
    // so the UI can show it and categorization can detect it later.
    serviceRequest: pickFirstValue(
      collected.service_request,
      collected.serviceRequest,
      collected.part_request,
      collected.partRequest,
      collected.Reason_for_call,
      collected.reason_for_call,
      collected.reason
    ),
    preferredDate: pickFirstValue(collected.preferred_date, collected.preferredDate),
    preferredTime: pickFirstValue(collected.preferred_time, collected.preferredTime),
    callBackCapture: pickFirstValue(collected.Call_Back_Capture, collected.call_back_capture)
  };
}

async function upsertCallAnalysisCustomerFields({
  callId,
  customerName,
  customerPhone,
  customerEmail,

  vehicleType,
  testDrive,
  tradeIn,
  vehicleMake,
  vehicleModel,
  vehicleYear,
  serviceRequest,
  preferredDate,
  preferredTime,
  callBackCapture
}) {
  const caTable = callAnalysis.tableName;
  const caCols = callAnalysis.columns;

  if (!callId) return;

  const hasAny =
    customerName != null ||
    customerPhone != null ||
    customerEmail != null ||
    vehicleType != null ||
    testDrive != null ||
    tradeIn != null ||
    vehicleMake != null ||
    vehicleModel != null ||
    vehicleYear != null ||
    serviceRequest != null ||
    preferredDate != null ||
    preferredTime != null ||
    callBackCapture != null;
  if (!hasAny) return;

  const { data: existing } = await supabase
    .from(caTable)
    .select('*')
    .eq(caCols.call_id, callId)
    .maybeSingle();

  if (existing) {
    const updatePayload = {};
    if (customerName != null) updatePayload[caCols.customer_name] = customerName;
    if (customerPhone != null) updatePayload[caCols.customer_phone] = customerPhone;
    if (customerEmail != null) updatePayload[caCols.customer_email] = customerEmail;
    if (vehicleType != null) updatePayload[caCols.vehicle_type] = vehicleType;
    if (testDrive != null) updatePayload[caCols.test_drive] = testDrive;
    if (tradeIn != null) updatePayload[caCols.trade_in] = tradeIn;
    if (vehicleMake != null) updatePayload[caCols.vehicle_make] = vehicleMake;
    if (vehicleModel != null) updatePayload[caCols.vehicle_model] = vehicleModel;
    if (vehicleYear != null) updatePayload[caCols.vehicle_year] = vehicleYear;
    if (serviceRequest != null) updatePayload[caCols.service_request] = serviceRequest;
    if (preferredDate != null) updatePayload[caCols.preferred_date] = preferredDate;
    if (preferredTime != null) updatePayload[caCols.preferred_time] = preferredTime;
    if (callBackCapture != null) updatePayload[caCols.call_back_capture] = callBackCapture;
    if (Object.keys(updatePayload).length === 0) return;

    const { error } = await supabase
      .from(caTable)
      .update(updatePayload)
      .eq(caCols.call_id, callId);
    if (error) throw error;
  } else {
    const insertPayload = {
      [caCols.call_id]: callId,
      [caCols.customer_name]: customerName,
      [caCols.customer_phone]: customerPhone,
      [caCols.customer_email]: customerEmail,
      [caCols.vehicle_type]: vehicleType ?? null,
      [caCols.test_drive]: testDrive ?? null,
      [caCols.trade_in]: tradeIn ?? null,
      [caCols.vehicle_make]: vehicleMake ?? null,
      [caCols.vehicle_model]: vehicleModel ?? null,
      [caCols.vehicle_year]: vehicleYear ?? null,
      [caCols.service_request]: serviceRequest ?? null,
      [caCols.preferred_date]: preferredDate ?? null,
      [caCols.preferred_time]: preferredTime ?? null,
      [caCols.call_back_capture]: callBackCapture ?? null
    };
    const { error } = await supabase.from(caTable).insert([insertPayload]);
    if (error) throw error;
  }
}

async function upsertUserHangupFlag({ callId, disconnectionReason }) {
  const caTable = callAnalysis.tableName;
  const caCols = callAnalysis.columns;

  if (!callId) return;
  const reason = String(disconnectionReason || '').trim();
  if (!reason || !/user/i.test(reason)) return;

  const { data: existing, error: existingError } = await supabase
    .from(caTable)
    .select('*')
    .eq(caCols.call_id, callId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const updatePayload = { [caCols.is_user_hangup]: true };
    if (!existing[caCols.disconnection_reason]) {
      updatePayload[caCols.disconnection_reason] = reason;
    }
    const { error } = await supabase
      .from(caTable)
      .update(updatePayload)
      .eq(caCols.call_id, callId);
    if (error) throw error;
    return;
  }

  const insertPayload = {
    [caCols.call_id]: callId,
    [caCols.disconnection_reason]: reason,
    [caCols.is_user_hangup]: true
  };
  const { error } = await supabase.from(caTable).insert([insertPayload]);
  if (error) throw error;
}

async function handleCallAnalyzed(payload) {
  const caTable = callAnalysis.tableName;
  const caCols = callAnalysis.columns;
  const callTable = call.tableName;
  const ccols = call.columns;
  const dealerTable = dealer.tableName;
  const dealerCols = dealer.columns;

  const analysis = payload.call_analysis || {};
  const custom = analysis.custom_analysis_data || {};
  const collected = payload.collected_dynamic_variables || {};

  const callId = payload.call_id;
  let dealerName = custom.Dealer_name || collected.dealer_name || null;
  let dealerPhone = collected.sales_transfer_phone || collected.service_transfer_phone || collected.parts_transfer_phone || null;
  // Primary phone (dealer's main number) is present in Retell collected variables as `dealer_phone`.
  // Service booking email lookup uses `dealers.primary_phone`, so we keep a dedicated field for that.
  const dealerPrimaryPhoneRaw = collected.dealer_phone || custom.dealer_phone || null;

  const normalizePhoneLookupVariants = (value) => {
    const s = String(value ?? '').trim();
    if (!s) return [];
    const digitsOnly = s.replace(/\D/g, '');
    const withPlus = s.startsWith('+') ? s : digitsOnly ? `+${digitsOnly}` : null;
    const withoutPlus = digitsOnly || null;
    const variants = [s, withPlus, withoutPlus].filter(Boolean);
    return [...new Set(variants)];
  };

  // Capture customer details from all known variable naming styles.
  const capturedCustomerName = pickFirstValue(
    custom.customer_name,
    custom.customerName,
    custom.name,
    collected.customer_name,
    collected.customerName,
    collected.name
  );
  const capturedCustomerPhone = normalizeCapturedPhone(
    pickFirstValue(
      custom.customer_phone,
      custom.customerPhone,
      custom.phone_number,
      custom.phone,
      collected.customer_phone,
      collected.customerPhone,
      collected.phone_number,
      collected.phone
    )
  );
  const capturedCustomerEmail = pickFirstValue(
    custom.customer_Email,
    custom.customer_email,
    custom.email,
    custom.customerEmail,
    collected.customer_Email,
    collected.customer_email,
    collected.email,
    collected.customerEmail
  );

  // If dealer not in payload (e.g. web call), get from calls table so Inbox shows this call for the right dealer
  if (!dealerName) {
    const { data: callRow } = await supabase.from(callTable).select(ccols.dealer_id).eq(ccols.id, callId).maybeSingle();
    if (callRow && callRow[ccols.dealer_id]) {
      const { data: dealerRow } = await supabase.from(dealerTable).select(dealerCols.dealer_name, dealerCols.primary_phone).eq(dealerCols.id, callRow[ccols.dealer_id]).maybeSingle();
      if (dealerRow) {
        dealerName = dealerRow[dealerCols.dealer_name];
        if (!dealerPhone) dealerPhone = dealerRow[dealerCols.primary_phone];
      }
    }
  }

  // user hangup detection
  const disconnectionReason = payload.disconnection_reason || null;
  const isUserHangup = disconnectionReason && /user/i.test(disconnectionReason);

  // If Retell didn't include `collected_dynamic_variables` again in `call_analyzed`,
  // we fall back to what we already saved into `call_analysis` during `transcript_updated`.
  const { data: existingForCategory } = await supabase
    .from(caTable)
    .select('*')
    .eq(caCols.call_id, callId)
    .maybeSingle();

  const vehicleTypeForCat = collected.vehicle_type || custom.vehicle_type || (existingForCategory && existingForCategory[caCols.vehicle_type]) || null;
  const testDriveForCat = collected.test_drive || custom.test_drive || (existingForCategory && existingForCategory[caCols.test_drive]) || null;
  const tradeInForCat = collected.trade_in || custom.trade_in || (existingForCategory && existingForCategory[caCols.trade_in]) || null;
  const serviceRequestForCat =
    collected.service_request ||
    custom.service_request ||
    collected.part_request ||
    custom.part_request ||
    (existingForCategory && existingForCategory[caCols.service_request]) ||
    null;

  const reasonForCat =
    collected.Reason_for_call ||
    collected.Reason_for_Call_Back ||
    collected.reason_for_call_back ||
    custom.Reason_for_call ||
    custom.Reason_for_Call_Back ||
    custom.reason_for_call_back ||
    (existingForCategory && existingForCategory[caCols.service_request]) ||
    null;

  // Tracker-based call routing (from Retell custom variable `call_type`)
  // This is the source of truth for which CRM section + email recipient we use.
  const trackerCallType = collected.call_type || null;

  const mapTrackerToDeptKey = (t) => {
    const v = String(t || '').toLowerCase();
    if (!v) return null;
    if (v.startsWith('sale') || v === 'sales_transfer') return 'sales';
    if (v.startsWith('service') || v === 'service_transfer') return 'service';
    if (v.startsWith('parts') || v === 'parts_transfer') return 'parts';
    return null;
  };

  const mapTrackerToCategory = (t) => {
    const v = String(t || '').toLowerCase();
    if (!v) return null;
    if (v === 'call_back') return 'callback';
    if (v === 'transfer_fail') return 'callback';
    if (v === 'sale_open' || v === 'sale_close') return 'sales';
    if (v === 'service_open' || v === 'service_close') return 'service';
    if (v === 'parts_open' || v === 'parts_close') return 'parts';
    if (v === 'sales_transfer') return 'sales';
    if (v === 'service_transfer') return 'service';
    if (v === 'parts_transfer') return 'parts';
    return null;
  };

  const callbackRequestedFromTracker = (() => {
    const v = String(trackerCallType || '').toLowerCase();
    return ['sale_close', 'service_close', 'parts_close', 'call_back', 'transfer_fail'].includes(v);
  })();

  // Tracker is the source of truth for whether the customer asked for a callback.
  // If `call_type` is present, ignore any other callback signals from the flow variables
  // (they sometimes get set globally and cause incorrect callback emails).
  const callbackRequestedFromFlow = trackerCallType
    ? callbackRequestedFromTracker
    : callbackRequestedFromTracker || Boolean(
        custom.Call_Back_Capture ||
          collected.Call_Back_Capture ||
          collected.Reason_for_Call_Back ||
          collected.reason_for_call_back ||
          custom.Reason_for_Call_Back ||
          custom.reason_for_call_back
      );

  const trackerCategory = mapTrackerToCategory(trackerCallType);
  const category = trackerCategory || categorizeCallFromAnalysis({
    ...custom,
    ...collected,
    service_request: serviceRequestForCat,
    vehicle_type: vehicleTypeForCat,
    test_drive: testDriveForCat,
    trade_in: tradeInForCat,
    Reason_for_call: reasonForCat
  });
  const analysisCategory = category;

  const upsertPayload = {
    [caCols.call_id]: callId,
    [caCols.dealer_name]: dealerName,
    [caCols.dealer_phone]: dealerPhone,
    [caCols.call_summary]: analysis.call_summary || null,
    [caCols.call_successful]: analysis.call_successful ?? null,
    [caCols.user_sentiment]: analysis.user_sentiment || null,
    [caCols.customer_name]: capturedCustomerName,
    [caCols.customer_phone]: capturedCustomerPhone,
    [caCols.customer_email]:
      capturedCustomerEmail,
    [caCols.vehicle_type]: collected.vehicle_type || custom.vehicle_type || null,
    [caCols.test_drive]: collected.test_drive || custom.test_drive || null,
    [caCols.trade_in]: collected.trade_in || custom.trade_in || null,
    [caCols.vehicle_make]: collected.vehicle_make || custom.vehicle_make || null,
    [caCols.vehicle_model]: collected.vehicle_model || custom.vehicle_model || null,
    [caCols.vehicle_year]: collected.vehicle_year || custom.vehicle_year || null,
    [caCols.service_request]:
      collected.service_request ||
      custom.service_request ||
      collected.part_request ||
      custom.part_request ||
      collected.Reason_for_call ||
      null,
    [caCols.preferred_date]: collected.preferred_date || custom.preferred_date || null,
    [caCols.preferred_time]: collected.preferred_time || custom.preferred_time || null,
    [caCols.call_back_capture]: custom.Call_Back_Capture || collected.Call_Back_Capture || null,
    [caCols.category]: category,
    [caCols.disconnection_reason]: disconnectionReason,
    [caCols.is_user_hangup]: isUserHangup,
    [caCols.recording_url]: payload.recording_url || null,
    [caCols.public_log_url]: payload.public_log_url || null,
    [caCols.start_timestamp]: payload.start_timestamp || null,
    [caCols.end_timestamp]: payload.end_timestamp || null,
    [caCols.duration_ms]: payload.duration_ms || null
  };

  // upsert by call_id
  const { data: existing, error: selError } = await supabase
    .from(caTable)
    .select('*')
    .eq(caCols.call_id, callId)
    .maybeSingle();
  if (selError) throw selError;

  if (existing) {
    // Prevent overwriting existing captured customer data with null values.
    const mergedPayload = { ...upsertPayload };
    if (mergedPayload[caCols.customer_name] == null && existing[caCols.customer_name]) {
      mergedPayload[caCols.customer_name] = existing[caCols.customer_name];
    }
    if (mergedPayload[caCols.customer_phone] == null && existing[caCols.customer_phone]) {
      mergedPayload[caCols.customer_phone] = existing[caCols.customer_phone];
    }
    if (mergedPayload[caCols.customer_email] == null && existing[caCols.customer_email]) {
      mergedPayload[caCols.customer_email] = existing[caCols.customer_email];
    }

    // Prevent overwriting already-saved sales/service/parts fields with null values.
    if (mergedPayload[caCols.vehicle_type] == null && existing[caCols.vehicle_type]) mergedPayload[caCols.vehicle_type] = existing[caCols.vehicle_type];
    if (mergedPayload[caCols.test_drive] == null && existing[caCols.test_drive]) mergedPayload[caCols.test_drive] = existing[caCols.test_drive];
    if (mergedPayload[caCols.trade_in] == null && existing[caCols.trade_in]) mergedPayload[caCols.trade_in] = existing[caCols.trade_in];
    if (mergedPayload[caCols.vehicle_make] == null && existing[caCols.vehicle_make]) mergedPayload[caCols.vehicle_make] = existing[caCols.vehicle_make];
    if (mergedPayload[caCols.vehicle_model] == null && existing[caCols.vehicle_model]) mergedPayload[caCols.vehicle_model] = existing[caCols.vehicle_model];
    if (mergedPayload[caCols.vehicle_year] == null && existing[caCols.vehicle_year]) mergedPayload[caCols.vehicle_year] = existing[caCols.vehicle_year];
    if (mergedPayload[caCols.service_request] == null && existing[caCols.service_request]) mergedPayload[caCols.service_request] = existing[caCols.service_request];
    if (mergedPayload[caCols.preferred_date] == null && existing[caCols.preferred_date]) mergedPayload[caCols.preferred_date] = existing[caCols.preferred_date];
    if (mergedPayload[caCols.preferred_time] == null && existing[caCols.preferred_time]) mergedPayload[caCols.preferred_time] = existing[caCols.preferred_time];
    if (mergedPayload[caCols.call_back_capture] == null && existing[caCols.call_back_capture]) mergedPayload[caCols.call_back_capture] = existing[caCols.call_back_capture];

    const { error } = await supabase
      .from(caTable)
      .update(mergedPayload)
      .eq(caCols.call_id, callId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from(caTable).insert([upsertPayload]);
    if (error) throw error;
  }

  // Read back merged values so email sending uses the final non-null fields.
  const { data: savedAnalysis } = await supabase
    .from(caTable)
    .select('*')
    .eq(caCols.call_id, callId)
    .maybeSingle();

  const customerPhone = savedAnalysis ? savedAnalysis[caCols.customer_phone] : null;
  const customerEmail = savedAnalysis ? savedAnalysis[caCols.customer_email] : null;
  const customerName = savedAnalysis ? savedAnalysis[caCols.customer_name] : null;
  const summary = analysis.call_summary || 'Inquiry from voice call';

  // Detect transfer-failed calls from call_transfers table so we can force callback follow-up handling.
  const transferTable = callTransfer.tableName;
  const transferCols = callTransfer.columns;
  let latestTransfer = null;
  {
    const { data } = await supabase
    .from(transferTable)
    .select('*')
    .eq(transferCols.call_id, callId)
    .order(transferCols.transfer_time, { ascending: false })
    .limit(1)
    .maybeSingle();
    latestTransfer = data || null;
  }

  // Fallback: if Retell did transfer events but we couldn't find a call_transfers row,
  // infer the intended department from the current Retell node names and insert a row.
  // This fixes cases where transfers were shown as "other" and didn't appear in Transfers page.
  if (!latestTransfer || !latestTransfer[transferCols.department] || !latestTransfer[transferCols.target_number]) {
    const prevNodeText = String(collected?.previous_node ?? '').toLowerCase();
    const curNodeText = String(collected?.current_node ?? '').toLowerCase();
    const nodeText = `${prevNodeText} ${curNodeText}`;

    let inferredDeptKey = null; // sales | service | parts
    if (/sales/.test(nodeText)) inferredDeptKey = 'sales';
    else if (/service/.test(nodeText)) inferredDeptKey = 'service';
    else if (/part/.test(nodeText)) inferredDeptKey = 'parts';

    const targetNumber =
      inferredDeptKey === 'sales'
        ? collected?.sales_transfer_phone
        : inferredDeptKey === 'service'
          ? collected?.service_transfer_phone
          : inferredDeptKey === 'parts'
            ? collected?.parts_transfer_phone
            : null;

    if (inferredDeptKey && targetNumber) {
      const fallbackPayload = {
        [transferCols.call_id]: callId,
        [transferCols.department]: inferredDeptKey,
        [transferCols.target_number]: targetNumber,
        [transferCols.transfer_time]: new Date().toISOString(),
        [transferCols.success]: null,
        [transferCols.failure_reason]: null
      };

      const { error: fallbackErr } = await supabase.from(transferTable).insert([fallbackPayload]);
      if (!fallbackErr) {
        latestTransfer = {
          [transferCols.department]: inferredDeptKey,
          [transferCols.target_number]: targetNumber,
          [transferCols.success]: null
        };
        console.log('[Retell][TransferFallbackFromNode]', {
          call_id: callId,
          inferredDeptKey,
          targetNumber,
          prevNode: prevNodeText || null,
          currentNode: curNodeText || null
        });
      } else {
        console.error('[Retell][TransferFallbackFromNode] insert failed:', fallbackErr);
      }
    }
  }

  // Tracker-based transfer success synchronization:
  // When Retell sets call_type to {sales_transfer, service_transfer, parts_transfer}
  // and we did NOT get transfer_fail, we treat it as a successful transfer
  // for CRM Transfers page + department email routing.
  const trackerCallTypeLower = String(trackerCallType || '').toLowerCase();
  const trackerTransferDeptKey =
    trackerCallTypeLower === 'sales_transfer'
      ? 'sales'
      : trackerCallTypeLower === 'service_transfer'
        ? 'service'
        : trackerCallTypeLower === 'parts_transfer'
          ? 'parts'
          : null;
  const trackerTransferTargetPhone =
    trackerTransferDeptKey === 'sales'
      ? collected.sales_transfer_phone || custom.sales_transfer_phone || null
      : trackerTransferDeptKey === 'service'
        ? collected.service_transfer_phone || custom.service_transfer_phone || null
        : trackerTransferDeptKey === 'parts'
          ? collected.parts_transfer_phone || custom.parts_transfer_phone || null
          : null;

  const trackerTransferIsSuccess = !!trackerTransferDeptKey && trackerCallTypeLower !== 'transfer_fail';

  if (trackerTransferIsSuccess && trackerTransferTargetPhone) {
    const targetNumber = trackerTransferTargetPhone;
    if (!latestTransfer || !latestTransfer[transferCols.id]) {
      const fallbackPayload = {
        [transferCols.call_id]: callId,
        [transferCols.department]: trackerTransferDeptKey,
        [transferCols.target_number]: targetNumber,
        [transferCols.transfer_time]: new Date().toISOString(),
        [transferCols.success]: true,
        [transferCols.failure_reason]: null
      };
      const { error: insertErr } = await supabase.from(transferTable).insert([fallbackPayload]);
      if (!insertErr) {
        console.log('[Retell][TransferSyncByTracker]', {
          call_id: callId,
          trackerCallType: trackerCallTypeLower,
          department: trackerTransferDeptKey,
          target_number: targetNumber
        });
      } else {
        console.error('[Retell][TransferSyncByTracker] insert failed:', insertErr);
      }
    } else {
      const updatePayload = {
        [transferCols.department]: trackerTransferDeptKey,
        [transferCols.target_number]: latestTransfer[transferCols.target_number] || targetNumber,
        [transferCols.success]: true,
        [transferCols.failure_reason]: null
      };
      const { error: updErr } = await supabase
        .from(transferTable)
        .update(updatePayload)
        .eq(transferCols.id, latestTransfer[transferCols.id]);
      if (!updErr) {
        console.log('[Retell][TransferSyncByTracker]', {
          call_id: callId,
          trackerCallType: trackerCallTypeLower,
          department: trackerTransferDeptKey,
          updated_latestTransfer_success: true
        });
      } else {
        console.error('[Retell][TransferSyncByTracker] update failed:', updErr);
      }
    }

    // Also set call header flags so CRM call header reflects transfer success.
    try {
      const callUpdate = {
        [ccols.transferred]: true,
        [ccols.transfer_target]: targetNumber,
        [ccols.transfer_success]: true
      };
      const { error: callUpdErr } = await supabase.from(callTable).update(callUpdate).eq(ccols.id, callId);
      if (callUpdErr) console.error('[Retell][TransferSyncByTracker] call header update failed:', callUpdErr);
    } catch (e) {
      console.error('[Retell][TransferSyncByTracker] call header update exception:', e);
    }
  }

  const hasTransferFailure = !!(latestTransfer && latestTransfer[transferCols.success] === false);

  console.log('[Retell][TransferInferenceDebug]', {
    call_id: callId,
    latestTransferDepartment: latestTransfer ? latestTransfer[transferCols.department] || null : null,
    latestTransferTarget: latestTransfer ? latestTransfer[transferCols.target_number] || null : null,
    latestTransferSuccess: latestTransfer ? latestTransfer[transferCols.success] : null
  });

  // Infer sales/service/parts type from transfer data when AI categorization is missing.
  const digitsOnly = (s) => String(s ?? '').replace(/\D/g, '');
  const mapDepartmentNameToRequestType = (name) => {
    const v = String(name ?? '').toLowerCase();
    if (!v) return null;
    if (v.includes('sale')) return 'sales';
    if (v.includes('part')) return 'parts';
    if (v.includes('service')) return 'service';
    return null;
  };

  let inferredRequestType = null;
  let finalCategory = analysisCategory;

  // Fetch dealer_id once so we can map transfer target -> departments.transfer_phone.
  let dealerId = null;
  {
    const { data: callRowForDealer } = await supabase
      .from(callTable)
      .select(ccols.dealer_id)
      .eq(ccols.id, callId)
      .maybeSingle();
    dealerId = callRowForDealer && callRowForDealer[ccols.dealer_id] ? callRowForDealer[ccols.dealer_id] : null;

    // Fallback: resolve dealer_id from the inbound DID (Retell call "to_number")
    // so dealer email notifications still work even if calls.dealer_id was missing.
    if (!dealerId) {
      const didLookup = payload.to_number || payload.toNumber || payload.did || null;
      if (didLookup) {
        const resolved = await getDealerIdForInboundNumber(didLookup);
        dealerId = resolved;
      }
    }

    console.log('[Email][DealerIdResolved]', {
      call_id: callId,
      dealerId: dealerId || null,
      dealerName,
      to_number: payload.to_number || payload.toNumber || payload.did || null
    });
  }

  let transferDepartmentName = latestTransfer ? latestTransfer[transferCols.department] : null;
  const transferTargetNumber = latestTransfer ? latestTransfer[transferCols.target_number] : null;

  if (dealerId && transferTargetNumber) {
    if (!transferDepartmentName || String(transferDepartmentName).toLowerCase() === 'unknown') {
      const deptTable = department.tableName;
      const deptCols = department.columns;
      const { data: deptRows } = await supabase.from(deptTable).select('*').eq(deptCols.dealer_id, dealerId);
      const targetDigits = digitsOnly(transferTargetNumber);
      const matched = (deptRows || []).find((d) => digitsOnly(d[deptCols.transfer_phone]) === targetDigits);
      if (matched) transferDepartmentName = matched[deptCols.department_name];
    }

    inferredRequestType = mapDepartmentNameToRequestType(transferDepartmentName);
    if (inferredRequestType && finalCategory !== 'callback') finalCategory = inferredRequestType;
  }

  // Backfill calls table so CRM call log shows Dealer, Caller, Intent, Outcome
  let outcomeCode = null;
  const isTrackerTransferFailEmail = String(trackerCallType || '').toLowerCase() === 'transfer_fail';
  if (hasTransferFailure || isTrackerTransferFailEmail) {
    outcomeCode = 'transfer_failed_callback';
  } else if (
    callbackRequestedFromFlow ||
    custom.Call_Back_Capture ||
    (collected.Call_Back_Capture && String(collected.Call_Back_Capture).toLowerCase() === 'true')
  ) {
    outcomeCode = 'callback_captured';
  } else if (analysis.call_successful === true) {
    outcomeCode = 'resolved_by_ai';
  } else if (analysis.call_successful === false) {
    outcomeCode = 'abandoned';
  }
  const callUpdate = {};
  if (finalCategory) callUpdate[ccols.detected_intent] = finalCategory;
  if (outcomeCode) callUpdate[ccols.outcome_code] = outcomeCode;
  if (hasTransferFailure || callbackRequestedFromFlow) callUpdate[ccols.callback_requested] = true;
  // Keep `calls.caller_number` as the original inbound caller number.
  // Only backfill it if it's missing and we have a better captured phone.
  if (customerPhone) {
    const { data: currentCall } = await supabase
      .from(callTable)
      .select(ccols.caller_number)
      .eq(ccols.id, callId)
      .maybeSingle();
    if (currentCall && !currentCall[ccols.caller_number]) {
      callUpdate[ccols.caller_number] = customerPhone;
    }
  }
  if (Object.keys(callUpdate).length > 0) {
    const { error: updateCallErr } = await supabase.from(callTable).update(callUpdate).eq(ccols.id, callId);
    if (updateCallErr) console.error('[Retell] call_analyzed backfill calls table:', updateCallErr);
  }

  // Persist callback request details (for the CRM "Callback capture" card).
  const shouldCreateCallbackLog = (hasTransferFailure || callbackRequestedFromFlow) && (customerName || customerPhone);
  if (shouldCreateCallbackLog) {
    const preferredTime = pickFirstValue(
      custom.preferred_time,
      custom.preferredTime,
      collected.preferred_time,
      collected.preferredTime,
      custom.preferred_date,
      collected.preferred_date
    );

    // Avoid duplicates if call_analyzed triggers multiple times.
    const { data: existingCbRows } = await supabase
      .from(callbackLog.tableName)
      .select(callbackLog.columns.id)
      .eq(callbackLog.columns.call_id, callId)
      .limit(1);

    if (!existingCbRows || existingCbRows.length === 0) {
      const insertPayload = {
        [callbackLog.columns.call_id]: callId,
        [callbackLog.columns.customer_name]: customerName,
        [callbackLog.columns.phone_number]: customerPhone,
        [callbackLog.columns.preferred_time]: preferredTime || null
      };

      const { error: cbInsertErr } = await supabase.from(callbackLog.tableName).insert([insertPayload]);
      if (cbInsertErr) console.error('[Retell] callback log insert failed:', cbInsertErr);
    }
  }

  // Persist tags for the CRM "Tags" card.
  // We derive tags from transfer + callback outcomes so they always appear at call end.
  const normalizeTag = (s) => {
    const raw = String(s ?? '').trim();
    if (!raw) return null;
    const cleaned = raw
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9:_-]+/g, '_')
      .slice(0, 50);
    return cleaned || null;
  };

  const tagSet = new Set();
  if (latestTransfer) {
    const dept = latestTransfer[transferCols.department];
    if (dept) tagSet.add(`department:${dept}`);
    if (latestTransfer[transferCols.success] === true) tagSet.add('transfer_success');
    if (latestTransfer[transferCols.success] === false) tagSet.add('transfer_failed');
  }
  if (finalCategory && (finalCategory === 'sales' || finalCategory === 'service' || finalCategory === 'parts')) {
    // Ensure tags still show the intended department even if Retell didn't send payload.department.
    tagSet.add(`department:${finalCategory}`);
  }
  if (hasTransferFailure || callbackRequestedFromFlow) tagSet.add('callback_requested');
  if (finalCategory) tagSet.add(`category:${finalCategory}`);
  if (outcomeCode) tagSet.add(outcomeCode);

  const tagsToInsert = Array.from(tagSet).map(normalizeTag).filter(Boolean);
  if (tagsToInsert.length > 0) {
    const { data: existingTagRows } = await supabase
      .from(callTag.tableName)
      .select(callTag.columns.tag)
      .eq(callTag.columns.call_id, callId);

    const existing = new Set((existingTagRows || []).map((r) => r[callTag.columns.tag]).filter(Boolean));
    const missing = tagsToInsert.filter((t) => !existing.has(t));

    if (missing.length > 0) {
      const insertRows = missing.map((t) => ({
        [callTag.columns.call_id]: callId,
        [callTag.columns.tag]: t
      }));
      const { error: tagInsertErr } = await supabase.from(callTag.tableName).insert(insertRows);
      if (tagInsertErr) console.error('[Retell] call tags insert failed:', tagInsertErr);
    }
  }

  // Notify customer and/or dealer by email when we have something to send
  let dealerEmail = null;
  let finalDealerName = dealerName;
  if (dealerId) {
    const { data: dealerRow } = await supabase
      .from(dealerTable)
      .select(dealerCols.dealer_name, dealerCols.contact_email)
      .eq(dealerCols.id, dealerId)
      .maybeSingle();
    if (dealerRow) {
      const rawEmail = dealerRow[dealerCols.contact_email];
      dealerEmail = typeof rawEmail === 'string' ? rawEmail.trim() || null : null;
      finalDealerName = dealerRow[dealerCols.dealer_name] || dealerName;
    }
  }
  // Fallback: if calls.dealer_id was not set, resolve dealer by dealer_name
  // so we can still notify the correct department email.
  if (!dealerEmail && dealerName) {
    const { data: dealerRowByName } = await supabase
      .from(dealerTable)
      .select(dealerCols.dealer_name, dealerCols.contact_email)
      .ilike(dealerCols.dealer_name, String(dealerName).trim())
      .maybeSingle();
    if (dealerRowByName) {
      const rawEmail = dealerRowByName[dealerCols.contact_email];
      dealerEmail = typeof rawEmail === 'string' ? rawEmail.trim() || null : null;
      finalDealerName = dealerRowByName[dealerCols.dealer_name] || dealerName;
    }

    console.log('[Email][DealerLookupByName]', {
      call_id: callId,
      dealerName: dealerName || null,
      found: !!dealerRowByName,
      finalDealerName: finalDealerName || null,
      dealerEmail: dealerRowByName && typeof dealerRowByName[dealerCols.contact_email] === 'string'
        ? dealerRowByName[dealerCols.contact_email].trim() || null
        : null
    });
  }

  // Strong fallback: resolve dealer email directly by inbound DID (Retell `to_number`).
  // Your DB stores inbound DID in `dealers.inbound_did`, so use it when email is still missing.
  if (!dealerEmail) {
    const didLookup = payload.to_number || payload.toNumber || payload.did || null;
    if (didLookup) {
      const didStr = String(didLookup).trim();
      const didVariants = [didStr];
      if (!didVariants.includes(didStr.startsWith('+') ? didStr : `+${didStr}`)) {
        didVariants.push(didStr.startsWith('+') ? didStr : `+${didStr}`);
      }
      if (didStr.startsWith('+')) didVariants.push(didStr.replace(/^\+/, ''));

      const didVariantsUnique = [...new Set(didVariants.filter(Boolean))];
      for (const v of didVariantsUnique) {
        const { data: dealerRowByDid } = await supabase
          .from(dealerTable)
          .select(dealerCols.dealer_name, dealerCols.contact_email, dealerCols.inbound_did, dealerCols.primary_phone)
          .eq(dealerCols.inbound_did, v)
          .maybeSingle();

        if (dealerRowByDid) {
          const rawEmail = dealerRowByDid[dealerCols.contact_email];
          const rawEmailType = typeof rawEmail;
          const rawEmailLen = rawEmailType === 'string' ? rawEmail.length : null;
          dealerEmail = typeof rawEmail === 'string' ? rawEmail.trim() || null : null;
          finalDealerName = dealerRowByDid[dealerCols.dealer_name] || dealerName;

          console.log('[Email][DealerLookupByInboundDid]', {
            call_id: callId,
            inbound_did: v,
            resolvedDealerName: finalDealerName,
            dealerEmail: dealerEmail || null,
            rawEmail,
            rawEmailType,
            rawEmailLen
          });
          break;
        }
      }
    }
  }

  // Final fallback: resolve dealer email by dealer primary phone (same approach as service booking).
  if (!dealerEmail && dealerPrimaryPhoneRaw) {
    const variants = normalizePhoneLookupVariants(dealerPrimaryPhoneRaw);
    for (const v of variants) {
      const { data: dealerRowByPrimaryPhone } = await supabase
        .from(dealerTable)
        .select(dealerCols.dealer_name, dealerCols.contact_email, dealerCols.primary_phone)
        .eq(dealerCols.primary_phone, v)
        .maybeSingle();

      if (dealerRowByPrimaryPhone) {
        const rawEmail = dealerRowByPrimaryPhone[dealerCols.contact_email];
        dealerEmail = typeof rawEmail === 'string' ? rawEmail.trim() || null : null;
        finalDealerName = dealerRowByPrimaryPhone[dealerCols.dealer_name] || dealerName;

        console.log('[Email][DealerLookupByPrimaryPhone]', {
          call_id: callId,
          dealerPrimaryPhone: dealerPrimaryPhoneRaw,
          lookupVariant: v,
          resolvedDealerName: finalDealerName,
          dealerEmail: dealerEmail || null
        });
        break;
      }
    }
  }

  const isCallbackFlow = hasTransferFailure || callbackRequestedFromFlow;
  const requestTypeForCallbackEmails = inferredRequestType || finalCategory || null;
  const requestTypeForRequestEmails = finalCategory === 'callback' ? null : finalCategory;

  // Department email routing:
  // If the call is for sales/service/parts, email the matching department contact_email.
  // If department email is missing (or department not found), fall back to dealer contact_email.
  let departmentEmail = null;
  let departmentNameForEmail = null;

  const emailDeptKey = (v) => ['sales', 'service', 'parts'].includes(String(v || '').toLowerCase()) ? String(v).toLowerCase() : null;
  const deptKeyForThisEmail =
    isCallbackFlow ? emailDeptKey(requestTypeForCallbackEmails) : emailDeptKey(requestTypeForRequestEmails);

  if (dealerId && deptKeyForThisEmail) {
    const recipient = await findDepartmentRecipientByKey({
      dealerId,
      deptKey: deptKeyForThisEmail
    });
    departmentEmail = recipient.email;
    departmentNameForEmail = recipient.name;
  }

  const recipientDealerEmail = departmentEmail || dealerEmail;

  const isTrackerTransferFail = String(trackerCallType || '').toLowerCase() === 'transfer_fail';

  // Transfer failure: send special "transfer failed" email to the intended department (not dealer).
  if (isTrackerTransferFailEmail) {
    const transferFailDeptKey = inferredRequestType || mapDepartmentNameToRequestType(transferDepartmentName) || null;
    if (dealerId && transferFailDeptKey) {
      const transferRecipient = await findDepartmentRecipientByKey({
        dealerId,
        deptKey: transferFailDeptKey
      });
      const transferFailDeptEmail = transferRecipient.email;

      if (transferFailDeptEmail || customerEmail) {
        const shouldSendTransferFailed = await claimEmailDispatch({
          callId,
          dispatchType: 'transfer_failed',
          metadata: {
            requestType: transferFailDeptKey,
            recipientDealerEmail: transferFailDeptEmail || null,
            customerEmail: customerEmail || null
          }
        });
        if (!shouldSendTransferFailed) {
          console.log('[Email][Dedup] transfer_failed already sent, skip', { call_id: callId });
          return;
        }
        emailService
          .notifyTransferFailed({
            dealerName: finalDealerName,
            dealerEmail: transferFailDeptEmail,
            customerName,
            customerEmail,
            customerPhone,
            summary,
            requestType: transferFailDeptKey
          })
          .catch((err) => console.error('[Email] transfer_failed notifyTransferFailed error:', err));
        return;
      }
    }
  }

  // Callback request: email both customer and dealer
  if (isCallbackFlow && (customerEmail || recipientDealerEmail)) {
    const shouldSendCallback = await claimEmailDispatch({
      callId,
      dispatchType: 'callback_request',
      metadata: {
        requestType: requestTypeForCallbackEmails || null,
        recipientDealerEmail: recipientDealerEmail || null,
        customerEmail: customerEmail || null
      }
    });
    if (!shouldSendCallback) {
      console.log('[Email][Dedup] callback_request already sent, skip', { call_id: callId });
      return;
    }
    console.log(
      '[Email][CallbackFlow]',
      'call_id=',
      callId,
      'hasTransferFailure=',
      hasTransferFailure,
      'recipientDealerEmail=',
      recipientDealerEmail || '(missing)',
      'customerEmail=',
      customerEmail || '(missing)'
    );
    emailService
      .notifyCallbackRequestReceived({
        dealerName: finalDealerName,
        dealerEmail: recipientDealerEmail,
        customerName,
        customerEmail,
        customerPhone,
        summary,
        requestType: requestTypeForCallbackEmails
      })
      .catch((err) => console.error('[Email] callback notifyCallbackRequestReceived error:', err));
  } else if (hasTransferFailure) {
    console.warn('[Email][CallbackFlow] transfer failed but no recipient email found', {
      call_id: callId,
      dealerEmail: recipientDealerEmail || null,
      customerEmail: customerEmail || null
    });
  }
  // Callback flow requested but neither customer nor dealer email available.
  else if (isCallbackFlow) {
    console.warn('[Email][CallbackFlow] callback requested but no email recipients found', {
      call_id: callId,
      dealerName: finalDealerName || dealerName,
      dealerId: dealerId || null,
      dealerEmail: recipientDealerEmail || null,
      customerEmail: customerEmail || null
    });
  }
  // User hangup: email both customer and dealer
  else if (isUserHangup && (customerEmail || recipientDealerEmail)) {
    const shouldSendHangup = await claimEmailDispatch({
      callId,
      dispatchType: 'user_hangup',
      metadata: {
        recipientDealerEmail: recipientDealerEmail || null,
        customerEmail: customerEmail || null
      }
    });
    if (!shouldSendHangup) {
      console.log('[Email][Dedup] user_hangup already sent, skip', { call_id: callId });
      return;
    }
    emailService
      .notifyUserHangup({
        dealerName: finalDealerName,
        dealerEmail: recipientDealerEmail || dealerEmail,
        customerName,
        customerEmail,
        customerPhone,
        summary
      })
      .catch((err) => console.error('[Email] hangup notifyUserHangup error:', err));
  }
  // Other call_analyzed: send to whichever recipient is available (dealer and/or customer).
  else if (recipientDealerEmail || customerEmail) {
    const shouldSendRequest = await claimEmailDispatch({
      callId,
      dispatchType: 'request_received',
      metadata: {
        requestType: requestTypeForRequestEmails || null,
        departmentName: departmentNameForEmail || null,
        departmentEmail: departmentEmail || null,
        recipientDealerEmail: recipientDealerEmail || null,
        customerEmail: customerEmail || null
      }
    });
    if (!shouldSendRequest) {
      console.log('[Email][Dedup] request_received already sent, skip', { call_id: callId });
      return;
    }
    console.log('[Email][RequestReceived]', {
      call_id: callId,
      requestType: requestTypeForRequestEmails,
      departmentName: departmentNameForEmail || null,
      departmentEmail: departmentEmail || null,
      dealerEmail: recipientDealerEmail || null,
      customerEmail: customerEmail || null
    });
    emailService
      .notifyRequestReceived({
        dealerName: finalDealerName,
        dealerEmail: recipientDealerEmail,
        customerName,
        customerEmail,
        customerPhone,
        summary,
        requestType: requestTypeForRequestEmails,
        isServiceBooking: finalCategory === 'service',
        appointmentDate: upsertPayload[caCols.preferred_date] || null,
        appointmentTime: upsertPayload[caCols.preferred_time] || null,
        vehicleMake: upsertPayload[caCols.vehicle_make] || null,
        vehicleModel: upsertPayload[caCols.vehicle_model] || null,
        vehicleYear: upsertPayload[caCols.vehicle_year] || null
      })
      .catch((err) => console.error('[Email] call_analyzed notifyRequestReceived error:', err));
  }
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

// Normalize phone fields: Retell may send them on payload or on req.body
function getToNumber(req, payload) {
  return payload.to_number || req.body.to_number || null;
}
function getFromNumber(req, payload) {
  return payload.from_number || req.body.from_number || null;
}

// Unified webhook handler
async function handleRetellWebhook(req, res) {
  const eventType = req.body.event || req.body.type;
  const payload = req.body.call || req.body;
  const toNumber = getToNumber(req, payload);
  const fromNumber = getFromNumber(req, payload);

  // Retell may send call_inbound without call_id (pre-call event). Accept and ignore.
  if (eventType === 'call_inbound') {
    console.log('[Retell] call_inbound pre-call event received');
    return res.status(200).json({ received: true, ignored: 'call_inbound' });
  }

  if (!eventType || !payload.call_id) {
    console.log('Invalid Retell webhook payload:', req.body);
    return res.status(400).json({ error: 'Missing event or call_id' });
  }

  // Log so you can confirm Retell is sending phone numbers (check backend terminal)
  console.log('[Retell]', eventType, 'call_id=', payload.call_id, 'to_number=', toNumber || '(missing)', 'from_number=', fromNumber ? '***' + fromNumber.slice(-4) : '(missing)');

  // Debug: if you added a custom retell dynamic variable named `call_type`,
  // log it here so you can confirm what value Retell is sending.
  // NOTE: Retell also uses `payload.call_type` for call type (phone_call/web_call),
  // so we log both to avoid confusion.
  const collectedDynamic = payload.collected_dynamic_variables || {};
  console.log('[Retell][call_typeVar]', {
    call_id: payload.call_id,
    eventType,
    payload_call_type: payload.call_type || null,
    collected_call_type: collectedDynamic.call_type ?? null,
    to_number: toNumber || null,
    from_number: fromNumber || null
  });

  try {
    const callTable = call.tableName;
    const ccols = call.columns;
    const existingCall = await supabase
      .from(callTable)
      .select('*')
      .eq(ccols.id, payload.call_id)
      .maybeSingle();

    if (!existingCall.data) {
      // Create call: dealer_id from to_number (phone) or default for web_call
      let inboundDealerId = toNumber ? await getDealerIdForInboundNumber(toNumber) : null;
      if (inboundDealerId == null && (payload.call_type === 'web_call' || !toNumber)) {
        inboundDealerId = getDefaultDealerIdForWebCall();
      }
      const insertPayload = {
        [ccols.id]: payload.call_id,
        [ccols.dealer_id]: inboundDealerId != null ? String(inboundDealerId) : null,
        [ccols.did]: toNumber || null,
        [ccols.caller_number]: fromNumber || null,
        [ccols.start_time]: payload.start_timestamp ? new Date(payload.start_timestamp).toISOString() : new Date().toISOString(),
        [ccols.outcome_code]: null,
        [ccols.transferred]: false,
        [ccols.callback_requested]: false
      };
      const { error: insertError } = await supabase.from(callTable).insert([insertPayload]);
      if (insertError) throw insertError;
    } else {
      // Backfill: set dealer_id/did/caller_number when missing
      const row = existingCall.data;
      const hasPhoneData = toNumber || fromNumber;
      const needsDealerBackfill = !row[ccols.dealer_id];
      const isWebCall = payload.call_type === 'web_call' || (!toNumber && !fromNumber);

      if (hasPhoneData && needsDealerBackfill) {
        const inboundDealerId = toNumber ? await getDealerIdForInboundNumber(toNumber) : (row[ccols.dealer_id] || null);
        const updatePayload = {};
        if (inboundDealerId != null) updatePayload[ccols.dealer_id] = String(inboundDealerId);
        if (toNumber) updatePayload[ccols.did] = toNumber;
        if (fromNumber) updatePayload[ccols.caller_number] = fromNumber;
        if (Object.keys(updatePayload).length > 0) {
          const { error: updateError } = await supabase.from(callTable).update(updatePayload).eq(ccols.id, payload.call_id);
          if (updateError) console.error('[Retell] backfill update failed:', updateError);
          else console.log('[Retell] backfilled dealer_id/did/caller_number for call', payload.call_id);
        }
      } else if (isWebCall && needsDealerBackfill) {
        const defaultId = getDefaultDealerIdForWebCall();
        if (defaultId != null) {
          const { error: updateError } = await supabase.from(callTable).update({ [ccols.dealer_id]: String(defaultId) }).eq(ccols.id, payload.call_id);
          if (updateError) console.error('[Retell] web_call dealer_id update failed:', updateError);
          else console.log('[Retell] set dealer_id for web_call', payload.call_id, '->', defaultId);
        }
      }
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

    // So handlers see phone numbers even if Retell put them on req.body
    if (toNumber && !payload.to_number) payload.to_number = toNumber;
    if (fromNumber && !payload.from_number) payload.from_number = fromNumber;

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
          // Some Retell calls send transcript_updated without transcript_object.
          // Persist whatever transcript-like field we can find so CRM isn't empty.
          const textCandidate =
            payload.transcript ||
            payload.text ||
            payload.message ||
            payload.transcription ||
            null;

          if (textCandidate && payload.call_id) {
            await handleTranscript({
              call_id: payload.call_id,
              speaker: 'system',
              text: String(textCandidate),
              timestamp: new Date().toISOString()
            });
          } else {
            console.log('transcript_updated without transcript_object:', payload);
          }
        }
        // Persist customer fields as soon as Retell collects them (important for web_call / transfer-failed flows).
        if (payload.collected_dynamic_variables && payload.call_id) {
          const {
            customerName,
            customerPhone,
            customerEmail,
            vehicleType,
            testDrive,
            tradeIn,
            vehicleMake,
            vehicleModel,
            vehicleYear,
            serviceRequest,
            preferredDate,
            preferredTime,
            callBackCapture
          } = extractCustomerFromCollected(payload.collected_dynamic_variables);
          await upsertCallAnalysisCustomerFields({
            callId: payload.call_id,
            customerName,
            customerPhone,
            customerEmail,
            vehicleType,
            testDrive,
            tradeIn,
            vehicleMake,
            vehicleModel,
            vehicleYear,
            serviceRequest,
            preferredDate,
            preferredTime,
            callBackCapture
          }).catch((err) => {
            console.error('[Retell] transcript_updated call-analysis upsert failed:', err.message || err);
          });
        }
        await upsertUserHangupFlag({
          callId: payload.call_id,
          disconnectionReason: payload.disconnection_reason
        }).catch((err) => {
          console.error('[Retell] transcript_updated user-hangup upsert failed:', err.message || err);
        });
        break;
      case 'intent_detected':
        await handleIntentDetected(payload);
        break;
      case 'call_transfer_attempt':
      case 'transfer_started':
        await handleTransferAttempt(payload);
        break;
      case 'call_transfer_success':
      case 'transfer_bridged':
        await handleTransferResult(payload, true);
        break;
      case 'call_transfer_failed':
      case 'transfer_cancelled':
        await handleTransferResult(payload, false);
        break;
      case 'call_ended':
        await handleCallEnded(payload);
        break;
      case 'call_summary':
        await handleCallSummary(payload);
        break;
      case 'call_analyzed':
        await handleCallAnalyzed(payload);
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


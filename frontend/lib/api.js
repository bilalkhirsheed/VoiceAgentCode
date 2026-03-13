const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    cache: 'no-store',
    ...options
  });

  if (!res.ok) {
    let body = null;
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    const msg = body?.error || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

// Dealers
async function getDealers() {
  return api('/api/dealers');
}

// Calls
async function getCalls(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    sp.set(k, String(v));
  });
  const qs = sp.toString();
  return api(`/api/calls${qs ? `?${qs}` : ''}`);
}

async function getCall(callId) {
  return api(`/api/calls/${encodeURIComponent(callId)}`);
}

async function getCallEvents(callId) {
  return api(`/api/calls/${encodeURIComponent(callId)}/events`);
}

async function getCallTranscripts(callId) {
  return api(`/api/calls/${encodeURIComponent(callId)}/transcripts`);
}

async function getCallTransfers(callId) {
  return api(`/api/calls/${encodeURIComponent(callId)}/transfers`);
}

async function getCallCallbackLogs(callId) {
  return api(`/api/calls/${encodeURIComponent(callId)}/callback-logs`);
}

async function getCallTags(callId) {
  return api(`/api/calls/${encodeURIComponent(callId)}/tags`);
}

module.exports = {
  api,
  getDealers,
  getCalls,
  getCall,
  getCallEvents,
  getCallTranscripts,
  getCallTransfers,
  getCallCallbackLogs,
  getCallTags
};


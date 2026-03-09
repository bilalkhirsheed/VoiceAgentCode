const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    let errorBody;
    try {
      errorBody = await res.json();
    } catch {
      throw new Error(`Request failed with status ${res.status}`);
    }
    throw new Error(errorBody.error || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// Dealers
export function apiGetDealers() {
  return request('/dealers');
}

export function apiCreateDealer(body) {
  return request('/dealers', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function apiUpdateDealer(id, body) {
  return request(`/dealers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
}

export function apiGetDealerConfigByPhone(did) {
  const encoded = encodeURIComponent(did);
  return request(`/dealer-config/${encoded}`);
}

// Departments
export function apiGetDealerDepartments(dealerId) {
  return request(`/dealers/${dealerId}/departments`);
}

export function apiCreateDepartment(body) {
  return request('/departments', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function apiCreateDepartmentHours(body) {
  return request('/department-hours', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function apiGetDepartmentHours(departmentId) {
  return request(`/departments/${departmentId}/hours`);
}

// Leads
export function apiGetLeads() {
  return request('/leads');
}

// Call logs
export function apiGetCalls(params = {}) {
  const search = new URLSearchParams(params);
  const q = search.toString();
  return request(`/calls${q ? `?${q}` : ''}`);
}

export function apiGetCall(id) {
  return request(`/calls/${id}`);
}

export function apiGetCallEvents(callId) {
  return request(`/calls/${callId}/events`);
}

export function apiGetCallTranscripts(callId) {
  return request(`/calls/${callId}/transcripts`);
}

export function apiGetCallTransfers(callId) {
  return request(`/calls/${callId}/transfers`);
}

export function apiGetCallCallbackLogs(callId) {
  return request(`/calls/${callId}/callback-logs`);
}

export function apiGetCallTags(callId) {
  return request(`/calls/${callId}/tags`);
}


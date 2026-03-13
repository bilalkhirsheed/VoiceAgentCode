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

// Calendar
export function apiGetCalendarEvents({ dealerPhone, timeMin, timeMax }) {
  const params = new URLSearchParams();
  if (dealerPhone) params.set('dealer_phone', dealerPhone);
  if (timeMin) params.set('time_min', timeMin);
  if (timeMax) params.set('time_max', timeMax);
  const q = params.toString();
  return request(`/calendar-events${q ? `?${q}` : ''}`);
}

// Dealer dashboard
export function apiGetDealerDashboard(dealerPhone) {
  const params = new URLSearchParams();
  if (dealerPhone) params.set('dealer_phone', dealerPhone);
  const q = params.toString();
  return request(`/dealer-dashboard${q ? `?${q}` : ''}`);
}

// Dealer reports
export function apiGetDealerSummaryReport(dealerPhone, days = 30) {
  const params = new URLSearchParams();
  if (dealerPhone) params.set('dealer_phone', dealerPhone);
  if (days) params.set('days', String(days));
  const q = params.toString();
  return request(`/reports/dealer-summary${q ? `?${q}` : ''}`);
}

// --- Admin APIs ---

export function apiAdminLogin(admin_id, admin_password) {
  return request('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ admin_id, admin_password })
  });
}

export function apiAdminListDealers({ search = '', page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  const q = params.toString();
  return request(`/admin/dealers${q ? `?${q}` : ''}`);
}

export function apiAdminGetDealerDetail(dealerId) {
  return request(`/admin/dealers/${dealerId}`);
}

export function apiAdminCreateDealer(body) {
  return request('/admin/dealers', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function apiAdminUpdateDealer(dealerId, body) {
  return request(`/admin/dealers/${dealerId}`, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
}

export function apiAdminDeleteDealer(dealerId) {
  return request(`/admin/dealers/${dealerId}`, {
    method: 'DELETE'
  });
}

export function apiAdminCreateDepartment(dealerId, body) {
  return request(`/admin/dealers/${dealerId}/departments`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function apiAdminUpdateDepartment(departmentId, body) {
  return request(`/admin/departments/${departmentId}`, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
}

export function apiAdminDeleteDepartment(departmentId) {
  return request(`/admin/departments/${departmentId}`, {
    method: 'DELETE'
  });
}

export function apiAdminReplaceDepartmentHours(departmentId, hours) {
  return request(`/admin/departments/${departmentId}/hours`, {
    method: 'POST',
    body: JSON.stringify({ hours })
  });
}

export function apiAdminUpdateHoursRow(hoursId, body) {
  return request(`/admin/hours/${hoursId}`, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
}

export function apiAdminDeleteHoursRow(hoursId) {
  return request(`/admin/hours/${hoursId}`, {
    method: 'DELETE'
  });
}

export function apiAdminListHolidays(dealerId) {
  return request(`/admin/dealers/${dealerId}/holidays`);
}

export function apiAdminCreateHoliday(dealerId, body) {
  return request(`/admin/dealers/${dealerId}/holidays`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function apiAdminUpdateHoliday(holidayId, body) {
  return request(`/admin/holidays/${holidayId}`, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
}

export function apiAdminDeleteHoliday(holidayId) {
  return request(`/admin/holidays/${holidayId}`, {
    method: 'DELETE'
  });
}


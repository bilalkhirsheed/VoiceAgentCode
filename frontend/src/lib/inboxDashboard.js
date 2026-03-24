/**
 * Shared logic for building inbox rows from dealer dashboard API response.
 * Used by InboxPage and by CrmLayout to compute unread count on load.
 */
export function buildInboxRows(dashboard) {
  if (!dashboard) return [];
  const buckets = ['sales', 'service', 'parts', 'callbacks', 'user_hangups'];
  const byCallId = new Map();

  buckets.forEach((key) => {
    const bucket = dashboard[key];
    const list = bucket?.latest || [];
    list.forEach((row) => {
      byCallId.set(row.call_id, {
        call_id: row.call_id,
        customer_name: row.customer_name || null,
        customer_phone: row.customer_phone || null,
        service_request: row.service_request || row.call_summary || null,
        category: row.category || key,
        created_at: row.created_at || null,
        outcome: row.call_successful ?? null,
        recording_url: row.recording_url || null
      });
    });
  });

  const recentCalls = dashboard.recent_calls || [];
  recentCalls.forEach((row) => {
    if (!byCallId.has(row.call_id)) {
      byCallId.set(row.call_id, {
        call_id: row.call_id,
        customer_name: row.customer_name || null,
        customer_phone: row.customer_phone || null,
        service_request: row.service_request || row.call_summary || null,
        category: row.category || 'other',
        created_at: row.created_at || null,
        outcome: null,
        recording_url: null
      });
    }
  });

  const rows = Array.from(byCallId.values());
  rows.sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    return db - da;
  });
  return rows;
}

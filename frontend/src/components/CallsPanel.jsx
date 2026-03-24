import React, { useEffect, useMemo, useState } from 'react';
import {
  apiGetCall,
  apiGetCallCallbackLogs,
  apiGetCallEvents,
  apiGetCallTags,
  apiGetCallTranscripts,
  apiGetCallTransfers,
  apiGetCalls
} from '../api.js';
import { DateTimePicker } from './ui/DateTimePicker';

export function CallsPanel() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState(null);
  const [filters, setFilters] = useState({
    outcome_code: '',
    dealer_id: '',
    from: '',
    to: ''
  });

  const [detail, setDetail] = useState({
    header: null,
    events: [],
    transcripts: [],
    transfers: [],
    callbacks: [],
    tags: []
  });
  const [detailLoading, setDetailLoading] = useState(false);

  const loadCalls = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.outcome_code) params.outcome_code = filters.outcome_code;
      if (filters.dealer_id) params.dealer_id = filters.dealer_id;
      if (filters.from) params.from = new Date(filters.from).toISOString();
      if (filters.to) params.to = new Date(filters.to).toISOString();
      const data = await apiGetCalls(params);
      setCalls(data || []);
      if (data && data.length > 0 && !selectedCallId) {
        setSelectedCallId(data[0].id);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to load calls: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCallId) return;
    (async () => {
      setDetailLoading(true);
      try {
        const [header, events, transcripts, transfers, callbacks, tags] =
          await Promise.all([
            apiGetCall(selectedCallId),
            apiGetCallEvents(selectedCallId),
            apiGetCallTranscripts(selectedCallId),
            apiGetCallTransfers(selectedCallId),
            apiGetCallCallbackLogs(selectedCallId),
            apiGetCallTags(selectedCallId)
          ]);
        setDetail({
          header,
          events: events || [],
          transcripts: transcripts || [],
          transfers: transfers || [],
          callbacks: callbacks || [],
          tags: tags || []
        });
      } catch (e) {
        console.error(e);
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [selectedCallId]);

  const selectedCall = useMemo(
    () => calls.find((c) => c.id === selectedCallId) || null,
    [calls, selectedCallId]
  );

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const applyFilters = (e) => {
    e.preventDefault();
    loadCalls();
  };

  return (
    <div className="layout-grid">
      <div className="card">
        <div className="card-header">
          <div>
            <h2>Call log</h2>
            <span>All calls across dealers, with filters</span>
          </div>
          <button className="btn secondary" type="button" onClick={loadCalls}>
            Refresh
          </button>
        </div>

        <form
          onSubmit={applyFilters}
          style={{ marginBottom: '0.6rem', display: 'flex', gap: '0.5rem' }}
        >
          <div className="field" style={{ minWidth: 140 }}>
            <label>Outcome</label>
            <select
              value={filters.outcome_code}
              onChange={(e) => handleFilterChange('outcome_code', e.target.value)}
            >
              <option value="">All</option>
              <option value="resolved_by_ai">Resolved by AI</option>
              <option value="transferred_to_sales">Transferred to Sales</option>
              <option value="transferred_to_service">Transferred to Service</option>
              <option value="transferred_to_parts">Transferred to Parts</option>
              <option value="callback_captured">Callback captured</option>
              <option value="abandoned">Abandoned</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="field" style={{ minWidth: 180 }}>
            <label>From</label>
            <DateTimePicker
              value={filters.from}
              onChange={(v) => handleFilterChange('from', v)}
              placeholder="mm/dd/yyyy —:— —"
              id="calls-panel-from"
              placement="below"
            />
          </div>
          <div className="field" style={{ minWidth: 180 }}>
            <label>To</label>
            <DateTimePicker
              value={filters.to}
              onChange={(v) => handleFilterChange('to', v)}
              placeholder="mm/dd/yyyy —:— —"
              id="calls-panel-to"
              placement="below"
            />
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="btn secondary" type="submit" disabled={loading}>
              Apply
            </button>
          </div>
        </form>

        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Started</th>
                <th>DID</th>
                <th>From</th>
                <th>Duration</th>
                <th>Intent</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedCallId(c.id)}
                  className={c.id === selectedCallId ? 'selected' : ''}
                >
                  <td>{c.start_time ? new Date(c.start_time).toLocaleString() : '-'}</td>
                  <td>{c.did || '-'}</td>
                  <td>{c.caller_number || '-'}</td>
                  <td>
                    {typeof c.duration_seconds === 'number'
                      ? `${Math.round(c.duration_seconds / 60)} min`
                      : '-'}
                  </td>
                  <td>{c.detected_intent || '-'}</td>
                  <td>
                    <span
                      className={
                        'pill-status ' +
                        (c.outcome_code ? c.outcome_code.replace(/\s+/g, '_') : '')
                      }
                    >
                      {c.outcome_code || '-'}
                    </span>
                  </td>
                </tr>
              ))}
              {!calls.length && !loading && (
                <tr>
                  <td colSpan={6} style={{ padding: '0.8rem', textAlign: 'center' }}>
                    No calls yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2>Call details</h2>
            <span>
              Timeline, transcript, transfers and callback capture for a single call
            </span>
          </div>
          {detailLoading && <span className="badge">Loading…</span>}
        </div>

        {!selectedCall ? (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
            Select a call from the list to inspect details.
          </span>
        ) : (
          <>
            <div className="meta-grid">
              <div className="meta-item">
                <span className="meta-label">Start / End</span>
                <span className="meta-value">
                  {selectedCall.start_time
                    ? new Date(selectedCall.start_time).toLocaleTimeString()
                    : '-'}{' '}
                  •{' '}
                  {selectedCall.end_time
                    ? new Date(selectedCall.end_time).toLocaleTimeString()
                    : '-'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Duration</span>
                <span className="meta-value">
                  {typeof selectedCall.duration_seconds === 'number'
                    ? `${Math.round(selectedCall.duration_seconds / 60)} min`
                    : '-'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Outcome</span>
                <span className="meta-value">
                  {selectedCall.outcome_code || '—'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Intent</span>
                <span className="meta-value">
                  {selectedCall.detected_intent || '—'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Transferred</span>
                <span className="meta-value">
                  {selectedCall.transferred ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Callback requested</span>
                <span className="meta-value">
                  {selectedCall.callback_requested ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            <div className="two-column" style={{ marginTop: '0.8rem' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-subtle)'
                  }}
                >
                  Events timeline
                </span>
                <div className="code-block" style={{ marginTop: '0.3rem' }}>
                  {detail.events.length === 0 ? (
                    <pre style={{ margin: 0 }}>// No events logged for this call.</pre>
                  ) : (
                    <pre style={{ margin: 0 }}>
                      {detail.events
                        .map(
                          (e) =>
                            `${new Date(e.event_time).toLocaleTimeString()}  [${
                              e.event_type
                            }] ${e.node_name || ''} ${
                              e.intent_detected ? `intent=${e.intent_detected}` : ''
                            }`
                        )
                        .join('\n')}
                    </pre>
                  )}
                </div>

                <span
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-subtle)',
                    display: 'inline-block',
                    marginTop: '0.6rem'
                  }}
                >
                  Transfers
                </span>
                <div className="code-block" style={{ marginTop: '0.3rem' }}>
                  {detail.transfers.length === 0 ? (
                    <pre style={{ margin: 0 }}>// No transfers recorded.</pre>
                  ) : (
                    <pre style={{ margin: 0 }}>
                      {detail.transfers
                        .map(
                          (t) =>
                            `${new Date(t.transfer_time).toLocaleTimeString()}  → ${
                              t.department || 'n/a'
                            } ${t.target_number || ''} ${
                              t.success ? '(success)' : `(failed: ${t.failure_reason})`
                            }`
                        )
                        .join('\n')}
                    </pre>
                  )}
                </div>
              </div>

              <div>
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-subtle)'
                  }}
                >
                  Transcript
                </span>
                <div className="code-block" style={{ marginTop: '0.3rem' }}>
                  {detail.transcripts.length === 0 ? (
                    <pre style={{ margin: 0 }}>// No transcript entries yet.</pre>
                  ) : (
                    <pre style={{ margin: 0 }}>
                      {detail.transcripts
                        .map(
                          (t) =>
                            `[${t.speaker}] ${t.message.replace(/\s+/g, ' ').trim()}`
                        )
                        .join('\n')}
                    </pre>
                  )}
                </div>

                <span
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-subtle)',
                    display: 'inline-block',
                    marginTop: '0.6rem'
                  }}
                >
                  Callback & tags
                </span>
                <div className="code-block" style={{ marginTop: '0.3rem' }}>
                  <pre style={{ margin: 0 }}>
                    {detail.callbacks.length === 0 &&
                    detail.tags.length === 0
                      ? '// No callback logs or tags.'
                      : ''}
                    {detail.callbacks.length > 0 &&
                      detail.callbacks
                        .map(
                          (c) =>
                            `callback → ${c.customer_name || ''} ${
                              c.phone_number || ''
                            } pref: ${c.preferred_time || '-'}`
                        )
                        .join('\n')}
                    {detail.callbacks.length > 0 && detail.tags.length > 0 ? '\n' : ''}
                    {detail.tags.length > 0 &&
                      `tags: ${detail.tags.map((t) => t.tag).join(', ')}`}
                  </pre>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


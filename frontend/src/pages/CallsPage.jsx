import { useState, useEffect } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { apiGetCalls } from '../api';

function formatDuration(seconds) {
  if (seconds == null) return '—';
  const s = Number(seconds);
  if (!Number.isFinite(s)) return '—';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

export function CallsPage() {
  const { selectedDealerId, search } = useOutletContext() ?? {};
  const location = useLocation();
  const query = location.search || '';
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [intent, setIntent] = useState('');
  const [outcome, setOutcome] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDealerId) params.dealer_id = selectedDealerId;
      if (outcome) params.outcome_code = outcome;
      if (from) params.from = from;
      if (to) params.to = to;
      const data = await apiGetCalls(params);
      let list = data ?? [];
      if (intent) list = list.filter((c) => (c.detected_intent || '').toLowerCase() === intent);
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(
          (c) =>
            (c.caller_number || '').toLowerCase().includes(q) ||
            (c.did || '').toLowerCase().includes(q) ||
            (c.detected_intent || '').toLowerCase().includes(q)
        );
      }
      setRows(list);
      setPage(1);
    } catch (e) {
      console.error(e);
      alert(e?.message ?? 'Failed to load calls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedDealerId]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[24px] font-semibold text-crm-text">Calls</div>
          <div className="mt-1 text-[13px] text-crm-text2">
            Operational call log with transcripts, recordings, transfers and callback capture.
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center rounded-[6px] border border-crm-border bg-white px-4 text-[13px] font-medium text-crm-text hover:bg-[#F9FAFB] disabled:opacity-50"
          onClick={load}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="mt-6 rounded-[6px] border border-crm-border bg-white p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <div className="mb-1 text-[12px] text-crm-text2">Intent</div>
            <select
              className="h-9 w-full rounded-[6px] border border-crm-border bg-white px-3 text-[13px] text-crm-text"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
            >
              <option value="">All</option>
              <option value="sales">Sales</option>
              <option value="service">Service</option>
              <option value="parts">Parts</option>
              <option value="general">General</option>
              <option value="callback">Callback</option>
            </select>
          </div>
          <div>
            <div className="mb-1 text-[12px] text-crm-text2">Outcome</div>
            <select
              className="h-9 w-full rounded-[6px] border border-crm-border bg-white px-3 text-[13px] text-crm-text"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
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
          <div>
            <div className="mb-1 text-[12px] text-crm-text2">From</div>
            <input
              type="datetime-local"
              className="h-9 w-full rounded-[6px] border border-crm-border bg-white px-3 text-[13px] text-crm-text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <div className="mb-1 text-[12px] text-crm-text2">To</div>
            <input
              type="datetime-local"
              className="h-9 w-full rounded-[6px] border border-crm-border bg-white px-3 text-[13px] text-crm-text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="h-9 w-full rounded-[6px] border border-crm-primary bg-crm-primary px-4 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
              onClick={load}
              disabled={loading}
            >
              Apply
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[6px] border border-crm-border">
          <div className="grid grid-cols-9 gap-0 bg-[#F9FAFB] px-4 py-3 text-[13px] font-medium text-crm-text">
            <div className="col-span-2">Time</div>
            <div>Dealer</div>
            <div>Caller</div>
            <div>Intent</div>
            <div>Duration</div>
            <div>Transfer</div>
            <div>Outcome</div>
            <div className="text-right">Actions</div>
          </div>
          <div>
            {pageRows.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-9 items-center gap-0 border-t border-crm-border px-4 text-[13px] text-crm-text hover:bg-[#F3F4F6]"
                style={{ minHeight: 44 }}
              >
                <div className="col-span-2 text-crm-text2">
                  {c.start_time ? new Date(c.start_time).toLocaleString() : '—'}
                </div>
                <div className="text-crm-text2">{c.did ?? '—'}</div>
                <div className="truncate">{c.caller_number ?? '—'}</div>
                <div className="capitalize text-crm-text2">{c.detected_intent ?? '—'}</div>
                <div className="text-crm-text2">{formatDuration(c.duration_seconds)}</div>
                <div className="text-crm-text2">
                  {c.transfer_success === true ? 'Success' : c.transfer_success === false ? 'Failed' : c.transferred ? 'Attempted' : '—'}
                </div>
                <div className="text-crm-text2">{c.outcome_code ?? '—'}</div>
                <div className="flex justify-end py-2">
                  <Link
                    to={`/crm/calls/${encodeURIComponent(c.id)}${query}`}
                    className="inline-flex h-8 items-center justify-center rounded-[6px] border border-crm-border bg-white px-3 text-[13px] text-crm-text hover:bg-[#F9FAFB]"
                  >
                    View details
                  </Link>
                </div>
              </div>
            ))}
            {pageRows.length === 0 && (
              <div className="border-t border-crm-border px-4 py-8 text-center text-[13px] text-crm-text2">
                No calls found.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[12px] text-crm-text2">
          <div>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)} of {rows.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-8 rounded-[6px] border border-crm-border bg-white px-3 text-[13px] disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span>Page {page} / {pageCount}</span>
            <button
              type="button"
              className="h-8 rounded-[6px] border border-crm-border bg-white px-3 text-[13px] disabled:opacity-50"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

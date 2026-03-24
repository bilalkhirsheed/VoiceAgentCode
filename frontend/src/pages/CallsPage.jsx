import { useState, useEffect } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { apiGetCalls } from '../api';
import { useToast } from '../contexts/ToastContext';
import { DateTimePicker } from '../components/ui/DateTimePicker';

function formatDuration(seconds) {
  if (seconds == null) return '—';
  const s = Number(seconds);
  if (!Number.isFinite(s)) return '—';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function formatOutcome(code) {
  if (!code || code === 'no_outcome') return 'No outcome';
  return code;
}

export function CallsPage() {
  const { selectedDealerId, search } = useOutletContext() ?? {};
  const location = useLocation();
  const toast = useToast();
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
      // Send From/To as ISO so backend can filter by start_time correctly
      if (from) params.from = new Date(from).toISOString();
      if (to) params.to = new Date(to).toISOString();
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
      toast.error(e?.message ?? 'Failed to load calls');
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
    <div className="crm-page">
      <div className="flex items-center justify-between gap-4">
        <div className="crm-page-header">
          <div className="crm-page-title">Calls</div>
          <div className="crm-page-subtitle">
            Operational call log with transcripts, recordings, transfers and callback capture.
          </div>
        </div>
        <button
          type="button"
          className="crm-press inline-flex h-9 items-center justify-center rounded-crm border border-slate-700 bg-slate-800 px-4 text-[13px] font-medium text-slate-100 shadow-crm-sm transition-all duration-150 hover:bg-slate-700 disabled:opacity-50"
          onClick={load}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="mt-6 crm-section-card">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <div className="mb-1 text-[12px] text-slate-400">Intent</div>
            <select
              className="h-9 w-full rounded-[6px] border border-slate-700 bg-slate-900 px-3 text-[13px] text-slate-100"
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
            <div className="mb-1 text-[12px] text-slate-400">Outcome</div>
            <select
              className="h-9 w-full rounded-[6px] border border-slate-700 bg-slate-900 px-3 text-[13px] text-slate-100"
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
            <div className="mb-1 text-[12px] text-slate-400">From</div>
            <DateTimePicker
              value={from}
              onChange={setFrom}
              placeholder="mm/dd/yyyy —:— —"
              id="calls-filter-from"
              placement="below"
            />
          </div>
          <div>
            <div className="mb-1 text-[12px] text-slate-400">To</div>
            <DateTimePicker
              value={to}
              onChange={setTo}
              placeholder="mm/dd/yyyy —:— —"
              id="calls-filter-to"
              placement="below"
            />
          </div>
          <div className="flex items-end">
          <button
            type="button"
            className="crm-press-sm h-9 w-full rounded-[8px] border border-sky-600 bg-sky-600 px-4 text-[13px] font-medium text-white hover:bg-sky-500 disabled:opacity-50 disabled:border-slate-600 disabled:bg-slate-800"
            onClick={load}
            disabled={loading}
          >
            {loading ? 'Applying…' : 'Apply'}
          </button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[8px] border border-slate-800 bg-slate-950/40">
          <div className="grid grid-cols-9 gap-0 border-b border-slate-600/80 bg-slate-900/80 px-4 py-3 text-[13px] font-medium text-slate-200">
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
                className="grid grid-cols-9 items-center gap-0 border-b border-slate-600/70 px-4 py-2.5 text-[13px] text-slate-100 transition-colors duration-150 hover:bg-slate-800/60"
                style={{ minHeight: 44 }}
              >
                <div className="col-span-2 text-slate-400">
                  {c.start_time ? new Date(c.start_time).toLocaleString() : '—'}
                </div>
                <div className="text-slate-400">{c.dealer_name ?? c.did ?? '—'}</div>
                <div className="truncate">{c.caller_number ?? '—'}</div>
                <div className="capitalize text-slate-400">{c.detected_intent ?? '—'}</div>
                <div className="text-slate-400">{formatDuration(c.duration_seconds)}</div>
                <div className="text-slate-400">
                  {c.transfer_success === true ? 'Success' : c.transfer_success === false ? 'Failed' : c.transferred ? 'Attempted' : 'No transfer'}
                </div>
                <div className="text-slate-400">{formatOutcome(c.outcome_code)}</div>
                <div className="flex justify-end py-2">
                  <Link
                    to={`/crm/calls/${encodeURIComponent(c.id)}${query}`}
                    className="crm-press-sm inline-flex h-8 items-center justify-center rounded-[8px] border border-slate-600 bg-slate-800 px-3 text-[13px] font-medium text-slate-100 hover:bg-slate-700"
                  >
                    View details
                  </Link>
                </div>
              </div>
            ))}
            {pageRows.length === 0 && (
              <div className="border-b border-slate-600/70 px-4 py-8 text-center text-[13px] text-slate-500">
                No calls found.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[12px] text-slate-400">
          <div>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)} of {rows.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="crm-press-sm h-8 rounded-[8px] border border-slate-600 bg-slate-800 px-3 text-[13px] font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50 disabled:border-slate-700 disabled:bg-slate-900"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span>Page {page} / {pageCount}</span>
            <button
              type="button"
              className="crm-press-sm h-8 rounded-[8px] border border-slate-600 bg-slate-800 px-3 text-[13px] font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50 disabled:border-slate-700 disabled:bg-slate-900"
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

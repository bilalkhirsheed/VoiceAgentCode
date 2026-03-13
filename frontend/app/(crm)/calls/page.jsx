'use client';

const React = require('react');
const Link = require('next/link');
const { Button } = require('../../../components/ui/button');
const { Input } = require('../../../components/ui/input');
const { Select } = require('../../../components/ui/select');
const { getCalls } = require('../../../lib/api');

function formatDuration(seconds) {
  if (seconds == null) return '—';
  const s = Number(seconds);
  if (!Number.isFinite(s)) return '—';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function dateToISO(dtLocal) {
  if (!dtLocal) return '';
  // Accepts input type=datetime-local (local), forward as-is; backend currently expects raw string.
  return dtLocal;
}

module.exports = function CallsPage({ selectedDealerId, search }) {
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState([]);

  const [intent, setIntent] = React.useState('');
  const [outcome, setOutcome] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const filtered = React.useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const caller = (r.caller_number || '').toLowerCase();
      const did = (r.did || '').toLowerCase();
      const intent = (r.detected_intent || '').toLowerCase();
      return caller.includes(q) || did.includes(q) || intent.includes(q);
    });
  }, [rows, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        dealer_id: selectedDealerId || '',
        outcome_code: outcome || '',
        from: dateToISO(from),
        to: dateToISO(to)
      };
      const data = await getCalls(params);
      let list = data || [];
      if (intent) {
        list = list.filter((c) => (c.detected_intent || '').toLowerCase() === intent);
      }
      setRows(list);
      setPage(1);
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDealerId]);

  React.useEffect(() => {
    setPage(1);
  }, [search, intent, outcome, from, to]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[24px] font-semibold text-crm-text">Calls</div>
          <div className="mt-1 text-[13px] text-crm-text2">
            Operational call log with transcripts, recordings, transfers and callback capture.
          </div>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div className="mt-6 rounded-crm border border-crm-border bg-white p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <div className="mb-1 text-[12px] text-crm-text2">Intent</div>
            <Select value={intent} onChange={(e) => setIntent(e.target.value)}>
              <option value="">All</option>
              <option value="sales">Sales</option>
              <option value="service">Service</option>
              <option value="parts">Parts</option>
              <option value="general">General</option>
              <option value="callback">Callback</option>
            </Select>
          </div>
          <div>
            <div className="mb-1 text-[12px] text-crm-text2">Outcome</div>
            <Select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              <option value="">All</option>
              <option value="resolved_by_ai">Resolved by AI</option>
              <option value="transferred_to_sales">Transferred to Sales</option>
              <option value="transferred_to_service">Transferred to Service</option>
              <option value="transferred_to_parts">Transferred to Parts</option>
              <option value="callback_captured">Callback captured</option>
              <option value="abandoned">Abandoned</option>
              <option value="failed">Failed</option>
            </Select>
          </div>
          <div>
            <div className="mb-1 text-[12px] text-crm-text2">From</div>
            <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-[12px] text-crm-text2">To</div>
            <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={load} disabled={loading} className="w-full">
              Apply
            </Button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-crm border border-crm-border">
          <div className="bg-[#F9FAFB]">
            <div className="grid grid-cols-9 gap-0 px-4 py-3 text-[13px] font-medium text-crm-text">
              <div className="col-span-2">Time</div>
              <div>Dealer</div>
              <div>Caller</div>
              <div>Intent</div>
              <div>Duration</div>
              <div>Transfer</div>
              <div>Outcome</div>
              <div className="text-right">Actions</div>
            </div>
          </div>
          <div>
            {pageRows.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-9 items-center gap-0 border-t border-crm-border px-4 text-[13px] text-crm-text hover:bg-[#F3F4F6]"
                style={{ height: 44 }}
              >
                <div className="col-span-2 text-crm-text2">
                  {c.start_time ? new Date(c.start_time).toLocaleString() : '—'}
                </div>
                <div className="text-crm-text2">{c.did || '—'}</div>
                <div className="truncate">{c.caller_number || '—'}</div>
                <div className="capitalize text-crm-text2">{c.detected_intent || '—'}</div>
                <div className="text-crm-text2">{formatDuration(c.duration_seconds)}</div>
                <div className="text-crm-text2">
                  {c.transfer_success === true
                    ? 'Success'
                    : c.transfer_success === false
                      ? 'Failed'
                      : c.transferred
                        ? 'Attempted'
                        : '—'}
                </div>
                <div className="text-crm-text2">{c.outcome_code || '—'}</div>
                <div className="flex justify-end">
                  <Link href={`/calls/${encodeURIComponent(c.id)}`}>
                    <Button variant="secondary">View details</Button>
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
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of{' '}
            {filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <div>
              Page {page} / {pageCount}
            </div>
            <Button
              variant="secondary"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};


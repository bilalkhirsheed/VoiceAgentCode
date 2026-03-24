import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { apiGetDealerSummaryReport } from '../api';

export function ReportsPage() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
   const [days, setDays] = useState(30);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dealerPhone = params.get('dealer_phone');
    if (!dealerPhone) {
      setError('No dealer DID provided. Go back to the entry page and enter a dealer number.');
      setSummary(null);
      return;
    }

    async function loadReport() {
      setError('');
      setLoading(true);
      try {
        const data = await apiGetDealerSummaryReport(dealerPhone.trim(), days);
        setSummary(data);
      } catch (e) {
        setSummary(null);
        setError(e.message || 'Failed to load reports.');
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [location.search, days]);

  const percentages = useMemo(() => {
    if (!summary || !summary.totals || !summary.totals.calls) return null;
    const t = summary.totals;
    const denom = t.calls || 1;
    const pct = (value) => Math.round(((value || 0) / denom) * 100);
    return {
      sales: pct(t.sales),
      service: pct(t.service),
      parts: pct(t.parts),
      callbacks: pct(t.callbacks),
      other: pct(t.other),
      user_hangups: pct(t.user_hangups)
    };
  }, [summary]);

  function handleDownloadCsv() {
    if (!summary) return;
    const t = summary.totals || {};
    const rows = [
      ['Dealer', summary.dealer_name || '', summary.dealer_phone || ''],
      ['Window (days)', summary.days],
      [],
      ['Metric', 'Count'],
      ['Total calls', t.calls || 0],
      ['Sales', t.sales || 0],
      ['Service', t.service || 0],
      ['Parts', t.parts || 0],
      ['Callbacks', t.callbacks || 0],
      ['Other', t.other || 0],
      ['User hangups', t.user_hangups || 0],
      ['Service appointments', t.service_appointments || 0]
    ];

    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const value = cell == null ? '' : String(cell);
            return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (summary.dealer_name || 'dealer').replace(/[^a-z0-9]+/gi, '-');
    a.href = url;
    a.download = `${safeName}-summary-${summary.days}d.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const dealerPhone = new URLSearchParams(location.search || '').get('dealer_phone');

  return (
    <div className="crm-page space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="crm-page-header">
          <h1 className="crm-page-title">Reports</h1>
          <p className="crm-page-subtitle">Call mix and service activity for this dealership.</p>
        </div>
        {dealerPhone && (
          <div className="flex flex-shrink-0 items-center gap-3">
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-slate-400">Window:</span>
              <select
                className="crm-press-sm rounded-[6px] border border-slate-600 bg-slate-800 px-2 py-1.5 text-[12px] text-slate-100 hover:bg-slate-700 disabled:opacity-60"
                value={days}
                onChange={(e) => setDays(Number(e.target.value) || 30)}
                disabled={loading}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={!summary || loading}
              className="crm-press-sm rounded-[8px] border border-sky-600 bg-sky-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-sky-500 disabled:opacity-50 disabled:border-slate-600 disabled:bg-slate-800"
            >
              Download CSV
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/70 rounded-[10px] px-3 py-2">
          {error}
        </div>
      )}

      {loading && !summary && !error && (
        <div className="text-sm text-slate-400">Loading reports…</div>
      )}

      {summary && !error && (
        <div className="space-y-5">
          <div className="crm-section-card flex flex-col gap-1">
            <div className="text-[14px] font-semibold text-slate-50">
              {summary.dealer_name} · {summary.dealer_phone}
            </div>
            <div className="text-[12px] text-slate-400">
              Window: last {summary.days} days
            </div>
          </div>

          {percentages && (
            <div className="crm-section-card space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold text-slate-50">Call mix</div>
                  <div className="text-[12px] text-slate-400">
                    Distribution of calls by category in this window.
                  </div>
                </div>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-900 flex">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${percentages.sales}%` }}
                  title={`Sales ${percentages.sales}%`}
                />
                <div
                  className="h-full bg-sky-500"
                  style={{ width: `${percentages.service}%` }}
                  title={`Service ${percentages.service}%`}
                />
                <div
                  className="h-full bg-indigo-500"
                  style={{ width: `${percentages.parts}%` }}
                  title={`Parts ${percentages.parts}%`}
                />
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${percentages.callbacks}%` }}
                  title={`Callbacks ${percentages.callbacks}%`}
                />
                <div
                  className="h-full bg-slate-400"
                  style={{ width: `${percentages.other}%` }}
                  title={`Other ${percentages.other}%`}
                />
                <div
                  className="h-full bg-rose-500/80"
                  style={{ width: `${percentages.user_hangups}%` }}
                  title={`User hangups ${percentages.user_hangups}%`}
                />
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Sales
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-sky-500" /> Service
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" /> Parts
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Callbacks
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-400" /> Other
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500/80" /> User hangups
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="crm-section-card--soft">
              <div className="text-[11px] uppercase text-slate-400">Total Calls</div>
              <div className="text-[18px] font-semibold text-slate-50">
                {summary.totals.calls}
              </div>
            </div>
            <div className="crm-section-card--soft">
              <div className="text-[11px] uppercase text-slate-400">Sales</div>
              <div className="text-[18px] font-semibold text-slate-50">
                {summary.totals.sales}
              </div>
              {percentages && (
                <div className="mt-1 text-[11px] text-slate-400">
                  {percentages.sales}% of calls
                </div>
              )}
            </div>
            <div className="crm-section-card--soft">
              <div className="text-[11px] uppercase text-slate-400">Service</div>
              <div className="text-[18px] font-semibold text-slate-50">
                {summary.totals.service}
              </div>
              {percentages && (
                <div className="mt-1 text-[11px] text-slate-400">
                  {percentages.service}% of calls
                </div>
              )}
            </div>
            <div className="crm-section-card--soft">
              <div className="text-[11px] uppercase text-slate-400">Parts</div>
              <div className="text-[18px] font-semibold text-slate-50">
                {summary.totals.parts}
              </div>
              {percentages && (
                <div className="mt-1 text-[11px] text-slate-400">
                  {percentages.parts}% of calls
                </div>
              )}
            </div>
            <div className="crm-section-card--soft">
              <div className="text-[11px] uppercase text-slate-400">Callbacks</div>
              <div className="text-[18px] font-semibold text-slate-50">
                {summary.totals.callbacks}
              </div>
              {percentages && (
                <div className="mt-1 text-[11px] text-slate-400">
                  {percentages.callbacks}% of calls
                </div>
              )}
            </div>
            <div className="crm-section-card--soft">
              <div className="text-[11px] uppercase text-slate-400">Other</div>
              <div className="text-[18px] font-semibold text-slate-50">
                {summary.totals.other}
              </div>
              {percentages && (
                <div className="mt-1 text-[11px] text-slate-400">
                  {percentages.other}% of calls
                </div>
              )}
            </div>
            <div className="crm-section-card--soft">
              <div className="text-[11px] uppercase text-slate-400">User Hangups</div>
              <div className="text-[18px] font-semibold text-slate-50">
                {summary.totals.user_hangups}
              </div>
              {percentages && (
                <div className="mt-1 text-[11px] text-slate-400">
                  {percentages.user_hangups}% of calls
                </div>
              )}
            </div>
            <div className="crm-section-card--soft">
              <div className="text-[11px] uppercase text-slate-400">Service Appointments</div>
              <div className="text-[18px] font-semibold text-slate-50">
                {summary.totals.service_appointments}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="crm-section-card space-y-2">
              <div className="text-[13px] font-semibold text-slate-50">Highlights</div>
              <ul className="list-disc list-inside text-[12px] text-slate-300 space-y-1.5">
                <li>
                  {summary.totals.calls} total calls in the last {summary.days} days with{' '}
                  {summary.totals.user_hangups} user hangups.
                </li>
                <li>
                  {summary.totals.service_appointments} service appointments booked; compare this
                  against service call volume to track conversion.
                </li>
                <li>
                  Use the window selector and CSV download to compare performance week-over-week or
                  month-over-month.
                </li>
              </ul>
            </div>
            <div className="crm-section-card space-y-2">
              <div className="text-[13px] font-semibold text-slate-50">How to use this report</div>
              <ul className="list-disc list-inside text-[12px] text-slate-300 space-y-1.5">
                <li>
                  Watch for high <span className="font-medium text-slate-200">Other</span> or{' '}
                  <span className="font-medium text-slate-200">User hangups</span> percentages — that can signal
                  issues with call flows.
                </li>
                <li>
                  Use the CSV export to share results with managers or import into Excel/Sheets for
                  deeper analysis.
                </li>
                <li>
                  Combine this with Inbox and Calls views to drill into specific conversations
                  driving these numbers.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


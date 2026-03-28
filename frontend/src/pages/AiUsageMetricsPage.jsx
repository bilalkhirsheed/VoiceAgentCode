import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiGetDealerDashboard } from '../api';
import { useToast } from '../contexts/ToastContext';

function formatMinutes(mins) {
  const n = Number(mins) || 0;
  return n.toLocaleString();
}

function formatNumber(n) {
  const x = Number(n) || 0;
  return x.toLocaleString();
}

function BarChart({ values, maxValue, barClassName }) {
  return (
    <div className="mt-3 h-36 w-full flex items-end gap-2">
      {values.map((v) => {
        const pct = maxValue > 0 ? (v.value / maxValue) * 100 : 0;
        return (
          <div key={v.key} className="flex-1 h-full flex flex-col items-center">
            <div className="w-full flex-1 flex items-end">
              <div
                className={`w-full rounded-md ${barClassName}`}
                style={{ height: `${Math.max(6, pct)}%` }}
                title={`${v.label}: ${formatNumber(v.value)}`}
              />
            </div>
            <div className="mt-2 text-[11px] text-slate-400 text-center">{v.shortLabel}</div>
          </div>
        );
      })}
    </div>
  );
}

export function AiUsageMetricsPage() {
  const toast = useToast();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dealerPhone = params.get('dealer_phone');
    if (!dealerPhone) {
      const msg = 'No dealer DID provided. Go back to the entry page and enter a dealer number.';
      setError(msg);
      setDashboard(null);
      return;
    }

    setLoading(true);
    setError('');
    apiGetDealerDashboard(dealerPhone.trim())
      .then((data) => setDashboard(data))
      .catch((e) => {
        const msg = e.message || 'Failed to load AI usage metrics.';
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, [location.search, toast]);

  const aiUsage = dashboard?.ai_usage;

  const windows = useMemo(() => {
    if (!aiUsage) return [];
    return [aiUsage.last_7_days, aiUsage.last_14_days, aiUsage.last_30_days, aiUsage.all_time].filter(
      Boolean
    );
  }, [aiUsage]);

  const maxMinutes = useMemo(() => Math.max(...windows.map((w) => Number(w.total_minutes) || 0)), [windows]);
  const maxCalls = useMemo(() => Math.max(...windows.map((w) => Number(w.call_count) || 0)), [windows]);

  const minutesChartValues = useMemo(
    () =>
      windows.map((w) => ({
        key: w.label,
        label: w.label,
        shortLabel: w.label.replace('Last ', '').replace(' days', 'd'),
        value: Number(w.total_minutes) || 0
      })),
    [windows]
  );

  const callsChartValues = useMemo(
    () =>
      windows.map((w) => ({
        key: `${w.label}-calls`,
        label: w.label,
        shortLabel: w.label.replace('Last ', '').replace(' days', 'd'),
        value: Number(w.call_count) || 0
      })),
    [windows]
  );

  return (
    <div className="crm-page space-y-6">
      <div className="crm-page-header">
        <h1 className="crm-page-title">AI Usage Metrics</h1>
        <p className="crm-page-subtitle">AI call minutes and call volume for this dealership.</p>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/70 rounded-[10px] px-3 py-2">
          {error}
        </div>
      )}

      {loading && !dashboard && !error && (
        <div className="text-sm text-slate-400">Loading AI usage metrics…</div>
      )}

      {dashboard && !error && aiUsage && (
        <div className="space-y-5">
          <div className="crm-section-card flex flex-col gap-1">
            <div className="text-[14px] font-semibold text-slate-50">
              {dashboard.dealer_name} · {dashboard.dealer_phone}
            </div>
            <div className="text-[12px] text-slate-400">Breakdown: 7d / 14d / 30d / All-time</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {windows.map((w) => {
              const minutes = Number(w.total_minutes) || 0;
              const calls = Number(w.call_count) || 0;
              const avg = calls > 0 ? minutes / calls : 0;
              return (
                <div key={w.label} className="rounded-[10px] border border-slate-800 bg-slate-950/50 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">{w.label}</div>
                  <div className="mt-2 text-[20px] font-semibold text-slate-50 tabular-nums">
                    {formatMinutes(minutes)} min
                  </div>
                  <div className="mt-1 text-[12px] text-slate-400 tabular-nums">
                    {formatNumber(calls)} calls
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 tabular-nums">
                    Avg: {avg ? `${avg.toFixed(1)} min/call` : '—'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="crm-section-card space-y-1.5">
              <div>
                <div className="text-[13px] font-semibold text-slate-50">AI Minutes Trend</div>
                <div className="text-[12px] text-slate-400">Minutes on AI-captured calls</div>
              </div>
              <BarChart
                values={minutesChartValues}
                maxValue={maxMinutes}
                barClassName="bg-sky-500/80"
              />
            </div>

            <div className="crm-section-card space-y-1.5">
              <div>
                <div className="text-[13px] font-semibold text-slate-50">AI Call Volume</div>
                <div className="text-[12px] text-slate-400">Number of AI calls</div>
              </div>
              <BarChart
                values={callsChartValues}
                maxValue={maxCalls}
                barClassName="bg-emerald-500/80"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


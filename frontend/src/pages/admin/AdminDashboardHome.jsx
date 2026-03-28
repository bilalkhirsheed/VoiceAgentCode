import { useEffect, useState } from 'react';
import { apiAdminGetMetricsOverview } from '../../api';
import { useToast } from '../../contexts/ToastContext';

export function AdminDashboardHome() {
  const toast = useToast();
  const [overview, setOverview] = useState({
    totals: {
      total_dealerships: 0,
      total_calls: 0,
      total_minutes: 0,
      total_live_agent_transfers: 0
    },
    dealerships: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await apiAdminGetMetricsOverview();
        setOverview(
          res || {
            totals: {
              total_dealerships: 0,
              total_calls: 0,
              total_minutes: 0,
              total_live_agent_transfers: 0
            },
            dealerships: []
          }
        );
      } catch (e) {
        const msg = e.message || 'Failed to load summary';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="crm-page-header">
        <h1 className="crm-page-title">Admin Overview</h1>
        <p className="crm-page-subtitle">
          High-level view of all dealerships configured for the voice agent.
        </p>
      </div>
      {error && (
        <div className="rounded-[10px] border border-red-900/70 bg-red-950/40 px-3 py-2 text-[12px] text-red-300">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="crm-section-card--soft transition-all duration-200 hover:-translate-y-0.5">
          <div className="text-[12px] uppercase tracking-wider text-slate-400 mb-1">Total Dealers</div>
          <div className="text-[26px] font-semibold tabular-nums text-slate-50">
            {loading ? '…' : (overview.totals?.total_dealerships ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="crm-section-card--soft transition-all duration-200 hover:-translate-y-0.5">
          <div className="text-[12px] uppercase tracking-wider text-slate-400 mb-1">Total Calls</div>
          <div className="text-[26px] font-semibold tabular-nums text-slate-50">
            {loading ? '…' : (overview.totals?.total_calls ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="crm-section-card--soft transition-all duration-200 hover:-translate-y-0.5">
          <div className="text-[12px] uppercase tracking-wider text-slate-400 mb-1">Total Minutes</div>
          <div className="text-[26px] font-semibold tabular-nums text-slate-50">
            {loading ? '…' : (overview.totals?.total_minutes ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="crm-section-card--soft transition-all duration-200 hover:-translate-y-0.5">
          <div className="text-[12px] uppercase tracking-wider text-slate-400 mb-1">Live Agent Transfers</div>
          <div className="text-[26px] font-semibold tabular-nums text-slate-50">
            {loading ? '…' : (overview.totals?.total_live_agent_transfers ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="crm-section-card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[14px] font-semibold text-slate-50">Per-Dealership Metrics</h2>
          <div className="text-[12px] text-slate-400">
            Calls, minutes, and live agent transfers by dealership.
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead className="bg-slate-900/70">
              <tr>
                <th className="px-3 py-2 text-left text-slate-300 font-medium">Dealership</th>
                <th className="px-3 py-2 text-left text-slate-300 font-medium">Phone</th>
                <th className="px-3 py-2 text-right text-slate-300 font-medium">Calls</th>
                <th className="px-3 py-2 text-right text-slate-300 font-medium">Minutes</th>
                <th className="px-3 py-2 text-right text-slate-300 font-medium">Live Transfers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(overview.dealerships || []).map((d) => (
                <tr key={d.dealer_id}>
                  <td className="px-3 py-2 text-slate-100">{d.dealer_name || '—'}</td>
                  <td className="px-3 py-2 text-slate-400">{d.dealer_phone || '—'}</td>
                  <td className="px-3 py-2 text-right text-slate-100 tabular-nums">{(d.total_calls || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-slate-100 tabular-nums">{(d.total_minutes || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-slate-100 tabular-nums">{(d.total_live_agent_transfers || 0).toLocaleString()}</td>
                </tr>
              ))}
              {!loading && (!overview.dealerships || overview.dealerships.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-3 py-5 text-center text-[12px] text-slate-500">
                    No dealership metrics available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

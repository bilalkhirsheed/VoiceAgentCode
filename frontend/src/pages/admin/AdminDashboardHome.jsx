import { useEffect, useState } from 'react';
import { apiAdminListDealers } from '../../api';
import { useToast } from '../../contexts/ToastContext';

export function AdminDashboardHome() {
  const toast = useToast();
  const [summary, setSummary] = useState({ totalDealers: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await apiAdminListDealers({ page: 1, limit: 1 });
        setSummary({ totalDealers: res.total || 0 });
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="crm-section-card--soft transition-all duration-200 hover:-translate-y-0.5">
          <div className="text-[12px] uppercase tracking-wider text-slate-400 mb-1">Total Dealers</div>
          <div className="text-[26px] font-semibold tabular-nums text-slate-50">
            {loading ? '…' : summary.totalDealers}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { apiAdminListDealers } from '../../api';

export function AdminDashboardHome() {
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
        setError(e.message || 'Failed to load summary');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[20px] font-semibold text-crm-text">Admin Overview</h1>
        <p className="text-[13px] text-crm-text2">
          High-level view of all dealerships configured for the voice agent.
        </p>
      </div>
      {error && (
        <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-[8px] border border-crm-border bg-white p-4">
          <div className="text-[12px] text-crm-text2 mb-1">Total Dealers</div>
          <div className="text-[24px] font-semibold text-crm-text">
            {loading ? '…' : summary.totalDealers}
          </div>
        </div>
      </div>
    </div>
  );
}


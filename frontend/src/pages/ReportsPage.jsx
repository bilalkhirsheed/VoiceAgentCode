import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiGetDealerSummaryReport } from '../api';

export function ReportsPage() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

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
        const data = await apiGetDealerSummaryReport(dealerPhone.trim(), 30);
        setSummary(data);
      } catch (e) {
        setSummary(null);
        setError(e.message || 'Failed to load reports.');
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [location.search]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-crm-text">Reports</h1>
        <p className="text-[13px] text-crm-text2">
          Last 30 days of call categories and service appointments for this dealership.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-[6px] px-3 py-2">
          {error}
        </div>
      )}

      {loading && !summary && !error && (
        <div className="text-sm text-crm-text2">Loading reports…</div>
      )}

      {summary && !error && (
        <div className="space-y-4">
          <div className="rounded-[6px] border border-crm-border bg-white p-4 flex flex-col gap-1">
            <div className="text-[14px] font-semibold text-crm-text">
              {summary.dealer_name} · {summary.dealer_phone}
            </div>
            <div className="text-[12px] text-crm-text2">
              Window: last {summary.days} days
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="rounded-[6px] border border-crm-border bg-white p-3">
              <div className="text-[11px] uppercase text-crm-text2">Total Calls</div>
              <div className="text-[18px] font-semibold text-crm-text">
                {summary.totals.calls}
              </div>
            </div>
            <div className="rounded-[6px] border border-crm-border bg-white p-3">
              <div className="text-[11px] uppercase text-crm-text2">Sales</div>
              <div className="text-[18px] font-semibold text-crm-text">
                {summary.totals.sales}
              </div>
            </div>
            <div className="rounded-[6px] border border-crm-border bg-white p-3">
              <div className="text-[11px] uppercase text-crm-text2">Service</div>
              <div className="text-[18px] font-semibold text-crm-text">
                {summary.totals.service}
              </div>
            </div>
            <div className="rounded-[6px] border border-crm-border bg-white p-3">
              <div className="text-[11px] uppercase text-crm-text2">Parts</div>
              <div className="text-[18px] font-semibold text-crm-text">
                {summary.totals.parts}
              </div>
            </div>
            <div className="rounded-[6px] border border-crm-border bg-white p-3">
              <div className="text-[11px] uppercase text-crm-text2">Callbacks</div>
              <div className="text-[18px] font-semibold text-crm-text">
                {summary.totals.callbacks}
              </div>
            </div>
            <div className="rounded-[6px] border border-crm-border bg-white p-3">
              <div className="text-[11px] uppercase text-crm-text2">Other</div>
              <div className="text-[18px] font-semibold text-crm-text">
                {summary.totals.other}
              </div>
            </div>
            <div className="rounded-[6px] border border-crm-border bg-white p-3">
              <div className="text-[11px] uppercase text-crm-text2">User Hangups</div>
              <div className="text-[18px] font-semibold text-crm-text">
                {summary.totals.user_hangups}
              </div>
            </div>
            <div className="rounded-[6px] border border-crm-border bg-white p-3">
              <div className="text-[11px] uppercase text-crm-text2">Service Appointments</div>
              <div className="text-[18px] font-semibold text-crm-text">
                {summary.totals.service_appointments}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


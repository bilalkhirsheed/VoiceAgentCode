import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { apiGetDealerDashboard } from '../api';

export function PartsRequestsPage() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dealerPhone = params.get('dealer_phone');
    if (!dealerPhone) {
      setError('No dealer DID provided. Go back to the entry page and enter a dealer number.');
      setRows([]);
      return;
    }

    async function loadParts() {
      setError('');
      setLoading(true);
      try {
        const data = await apiGetDealerDashboard(dealerPhone.trim());
        const list = data.parts?.latest || [];
        setRows(list);
      } catch (e) {
        setRows([]);
        setError(e.message || 'Failed to load parts requests.');
      } finally {
        setLoading(false);
      }
    }

    loadParts();
  }, [location.search]);

  return (
    <div className="crm-page flex flex-col h-full space-y-4">
      <div className="crm-page-header">
        <h1 className="crm-page-title">Parts Requests</h1>
        <p className="crm-page-subtitle">
          Parts and accessories inquiries captured by the AI for this dealer.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-300 bg-red-950/40 border border-red-900/70 rounded-[10px] px-3 py-2">
          {error}
        </div>
      )}

      {loading && !rows.length && !error && (
        <div className="text-sm text-slate-400">Loading parts requests…</div>
      )}

      <div className="flex-1 overflow-auto border border-slate-800 rounded-[6px] bg-slate-950/40 crm-section-card">
        <table className="crm-table min-w-full text-sm">
          <thead>
            <tr>
              <th>When</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Request</th>
              <th>Summary</th>
              <th>See Call</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && !error && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500 text-sm border-r-0">
                  No parts requests found yet.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const created = row.created_at ? new Date(row.created_at) : null;
              const whenLabel = created
                ? created.toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })
                : '-';

              return (
                <tr key={row.call_id}>
                  <td className="whitespace-nowrap text-slate-100">{whenLabel}</td>
                  <td className="whitespace-nowrap text-slate-100">{row.customer_name || '-'}</td>
                  <td className="whitespace-nowrap text-slate-300">{row.customer_phone || '-'}</td>
                  <td className="text-slate-300 text-xs max-w-xs whitespace-pre-line">
                    {row.service_request || row.call_summary || '-'}
                  </td>
                  <td className="text-slate-300 text-xs max-w-[220px] whitespace-pre-line">
                    {(() => {
                      const vehicle = [row.vehicle_year, row.vehicle_make, row.vehicle_model]
                        .filter(Boolean)
                        .join(' ')
                        .trim();
                      const detail = (row.service_request || row.call_summary || '').toString();
                      const excerpt = detail.length > 80 ? detail.slice(0, 80) + '…' : detail;
                      return vehicle ? `${vehicle}\n${excerpt || '-'}` : excerpt || '-';
                    })()}
                  </td>
                  <td className="whitespace-nowrap text-sky-400 text-xs">
                    <Link
                      to={`/crm/calls/${encodeURIComponent(row.call_id)}${location.search}`}
                      className="hover:underline"
                    >
                      See Call
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


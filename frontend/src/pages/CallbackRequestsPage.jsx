import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { apiGetDealerDashboard } from '../api';

export function CallbackRequestsPage() {
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

    async function loadCallbacks() {
      setError('');
      setLoading(true);
      try {
        const data = await apiGetDealerDashboard(dealerPhone.trim());
        const list = data.callbacks?.latest || [];
        setRows(list);
      } catch (e) {
        setRows([]);
        setError(e.message || 'Failed to load callback requests.');
      } finally {
        setLoading(false);
      }
    }

    loadCallbacks();
  }, [location.search]);

  return (
    <div className="p-6 flex flex-col h-full space-y-4">
      <div>
        <h1 className="text-[20px] font-semibold text-crm-text">Callback Requests</h1>
        <p className="text-[13px] text-crm-text2">
          After-hours and callback-captured calls you need to follow up on.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-[6px] px-3 py-2">
          {error}
        </div>
      )}

      {loading && !rows.length && !error && (
        <div className="text-sm text-crm-text2">Loading callback requests…</div>
      )}

      <div className="flex-1 overflow-auto border border-crm-border rounded-[6px] bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">When</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Customer</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Phone</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Reason</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Recording</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">See Call</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && !loading && !error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">
                  No callback requests found yet.
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
                  <td className="px-4 py-2 whitespace-nowrap text-gray-900">{whenLabel}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-900">{row.customer_name || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-700">{row.customer_phone || '-'}</td>
                  <td className="px-4 py-2 text-gray-700 text-xs max-w-xs whitespace-pre-line">
                    {row.service_request || row.call_summary || '-'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-blue-600 text-xs">
                    {row.recording_url ? (
                      <a
                        href={row.recording_url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        Listen
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-blue-600 text-xs">
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


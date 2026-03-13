import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiGetDealerDashboard } from '../api';

export function ServiceAppointmentsPage() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [serviceCalls, setServiceCalls] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dealerPhone = params.get('dealer_phone');
    if (!dealerPhone) {
      setError('No dealer DID provided. Go back to the entry page and enter a dealer number.');
      setAppointments([]);
      setServiceCalls([]);
      return;
    }

    async function loadData() {
      setError('');
      setLoading(true);
      try {
        const data = await apiGetDealerDashboard(dealerPhone.trim());
        setAppointments(data.service_appointments?.latest || []);
        setServiceCalls(data.service?.latest || []);
      } catch (e) {
        setAppointments([]);
        setServiceCalls([]);
        setError(e.message || 'Failed to load service requests.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [location.search]);

  return (
    <div className="p-6 flex flex-col h-full space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-crm-text">Service Appointments</h1>
        <p className="text-[13px] text-crm-text2">
          Booked service appointments and recent service-related calls for this dealer.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-[6px] px-3 py-2">
          {error}
        </div>
      )}

      {loading && !appointments.length && !serviceCalls.length && !error && (
        <div className="text-sm text-crm-text2">Loading service requests…</div>
      )}

      <div className="space-y-4">
        <div>
          <h2 className="text-[16px] font-semibold text-crm-text">Booked Service Appointments (Next 7 Days)</h2>
          <div className="mt-2 flex-1 overflow-auto border border-crm-border rounded-[6px] bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">When</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Customer</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Vehicle</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Service Request</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Calendar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">
                      No booked service appointments yet.
                    </td>
                  </tr>
                )}
                {appointments
                  .filter((row) => {
                    const now = new Date();
                    const inSeven = new Date();
                    inSeven.setDate(now.getDate() + 7);
                    const start = row.start_time_local || row.preferred_date;
                    if (!start) return false;
                    const d = new Date(start);
                    return d >= now && d <= inSeven;
                  })
                  .map((row) => {
                    const start = row.start_time_local || row.preferred_date;
                    const startDate = start ? new Date(start) : null;
                    const whenLabel = startDate
                      ? `${startDate.toLocaleDateString(undefined, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })} ${startDate.toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit'
                        })}`
                      : `${row.preferred_date || '-'} ${row.preferred_time || ''}`.trim();

                    const vehicle =
                      row.vehicle_make || row.vehicle_model || row.vehicle_year
                        ? `${row.vehicle_year || ''} ${row.vehicle_make || ''} ${row.vehicle_model || ''}`.trim()
                        : '-';

                    return (
                      <tr key={row.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{whenLabel}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                          {row.customer_name || '-'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-700">{vehicle}</td>
                        <td className="px-4 py-2 text-gray-700 text-xs max-w-xs whitespace-pre-line">
                          {row.service_request || '-'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-blue-600 text-xs">
                          {row.calendar_html_link ? (
                            <a
                              href={row.calendar_html_link}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline"
                            >
                              Open in Calendar
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-[16px] font-semibold text-crm-text">Recent Service Calls</h2>
          <div className="mt-2 flex-1 overflow-auto border border-crm-border rounded-[6px] bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">When</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Customer</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Phone</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Request</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {serviceCalls.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">
                      No recent service calls yet.
                    </td>
                  </tr>
                )}
                {serviceCalls.map((row) => {
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
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                        {row.customer_name || '-'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                        {row.customer_phone || '-'}
                      </td>
                      <td className="px-4 py-2 text-gray-700 text-xs max-w-xs whitespace-pre-line">
                        {row.service_request || row.call_summary || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


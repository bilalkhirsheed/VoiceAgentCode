import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiGetDealerDashboard } from '../api';

export function ServiceAppointmentsPage() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [serviceCalls, setServiceCalls] = useState([]);
  const [viewMode, setViewMode] = useState('next7'); // next7 | upcoming | all

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

  const upcomingCount = appointments.filter((row) => {
    const start = row.start_time_local || row.preferred_date;
    if (!start) return false;
    const d = new Date(start);
    const now = new Date();
    return d >= now;
  }).length;

  const nextAppt = (() => {
    const sorted = [...appointments].sort((a, b) => {
      const sa = a.start_time_local || a.preferred_date || '';
      const sb = b.start_time_local || b.preferred_date || '';
      return new Date(sa) - new Date(sb);
    });
    const now = new Date();
    const upcoming = sorted.find((row) => {
      const start = row.start_time_local || row.preferred_date;
      if (!start) return false;
      return new Date(start) >= now;
    });
    if (!upcoming) return null;
    const start = upcoming.start_time_local || upcoming.preferred_date;
    const d = new Date(start);
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  })();

  return (
    <div className="crm-page flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="crm-page-header">
          <h1 className="crm-page-title">Service Appointments</h1>
          <p className="crm-page-subtitle">
            Booked service appointments and recent service-related calls for this dealer.
          </p>
        </div>
        {loading && (
          <div className="text-[12px] text-slate-400">Syncing latest calendar & calls…</div>
        )}
      </div>

      {!error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="crm-section-card--soft flex flex-col">
            <span className="text-[11px] uppercase tracking-wide text-slate-400">
              Upcoming appointments
            </span>
            <span className="mt-1 text-[18px] font-semibold text-slate-50">{upcomingCount}</span>
          </div>
          <div className="crm-section-card--soft flex flex-col">
            <span className="text-[11px] uppercase tracking-wide text-slate-400">
              Next appointment
            </span>
            <span className="mt-1 text-[13px] text-slate-200">
              {nextAppt || 'No upcoming appointment'}
            </span>
          </div>
          <div className="crm-section-card--soft flex flex-col">
            <span className="text-[11px] uppercase tracking-wide text-slate-400">
              Recent service calls
            </span>
            <span className="mt-1 text-[18px] font-semibold text-slate-50">
              {serviceCalls.length}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-300 bg-red-950/40 border border-red-900/70 rounded-[10px] px-3 py-2">
          {error}
        </div>
      )}

      {loading && !appointments.length && !serviceCalls.length && !error && (
        <div className="text-sm text-slate-400">Loading service requests…</div>
      )}

      <div className="space-y-4">
        <div className="crm-section-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold text-slate-50">Booked Service Appointments</h2>
            <div className="flex items-center gap-2 text-[12px] text-slate-400">
              <span>Show:</span>
              <select
                className="crm-press-sm h-8 rounded-[6px] border border-slate-700 bg-slate-900 px-2 text-[12px] text-slate-100 hover:bg-slate-800"
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
              >
                <option value="next7">Next 7 days</option>
                <option value="upcoming">All upcoming</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
          <div className="mt-2 flex-1 overflow-auto border border-slate-800 rounded-[8px] bg-slate-950/40 shadow-crm">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Service Request</th>
                  <th>Calendar</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500 text-sm border-r-0">
                      No booked service appointments yet.
                    </td>
                  </tr>
                )}
                {appointments
                  .filter((row) => {
                    const start = row.start_time_local || row.preferred_date;
                    if (!start) return false;
                    const d = new Date(start);
                    const now = new Date();
                    if (viewMode === 'next7') {
                      const inSeven = new Date();
                      inSeven.setDate(now.getDate() + 7);
                      return d >= now && d <= inSeven;
                    }
                    if (viewMode === 'upcoming') {
                      return d >= now;
                    }
                    return true; // all
                  })
                  .sort((a, b) => {
                    const sa = a.start_time_local || a.preferred_date || '';
                    const sb = b.start_time_local || b.preferred_date || '';
                    return new Date(sa) - new Date(sb);
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
                        <td className="whitespace-nowrap text-slate-100">{whenLabel}</td>
                        <td className="whitespace-nowrap text-slate-100">
                          {row.customer_name || '-'}
                        </td>
                        <td className="whitespace-nowrap text-slate-300">{vehicle}</td>
                        <td className="text-slate-300 text-xs max-w-xs whitespace-pre-line">
                          {row.service_request || '-'}
                        </td>
                        <td className="whitespace-nowrap text-xs">
                          {row.calendar_html_link ? (
                            <a
                              href={row.calendar_html_link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 font-medium text-sky-400 hover:text-sky-300 hover:underline"
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

        <div className="crm-section-card">
          <h2 className="text-[16px] font-semibold text-slate-50">Recent Service Calls</h2>
          <div className="mt-2 flex-1 overflow-auto border border-slate-800 rounded-[8px] bg-slate-950/40 shadow-crm">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Request</th>
                </tr>
              </thead>
              <tbody>
                {serviceCalls.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500 text-sm border-r-0">
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
                        <td className="whitespace-nowrap text-slate-100">{whenLabel}</td>
                        <td className="whitespace-nowrap text-slate-100">
                        {row.customer_name || '-'}
                      </td>
                        <td className="whitespace-nowrap text-slate-300">
                        {row.customer_phone || '-'}
                      </td>
                        <td className="text-slate-300 text-xs max-w-xs whitespace-pre-line">
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


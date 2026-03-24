import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiGetCalendarEvents } from '../api';

export function CalendarPage() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dealerPhone = params.get('dealer_phone');
    if (!dealerPhone) {
      setError('No dealer DID provided. Go back to the entry page and enter a dealer number.');
      setEvents([]);
      return;
    }

    async function loadEvents() {
      setError('');
      setLoading(true);
      try {
        const now = new Date();
        const start = now.toISOString();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 7);
        const end = endDate.toISOString();

        const res = await apiGetCalendarEvents({
          dealerPhone: dealerPhone.trim(),
          timeMin: start,
          timeMax: end
        });
        setEvents(res.events || []);
      } catch (e) {
        setError(e.message || 'Failed to load events.');
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [location.search]);

  return (
    <div className="crm-page flex flex-col h-full space-y-6">
      <div className="crm-page-header">
        <h1 className="crm-page-title">Service Calendar</h1>
        <p className="crm-page-subtitle">
          View service_request bookings pulled from Google Calendar for this dealer.
        </p>
      </div>

      {error && (
        <div className="rounded-[10px] border border-red-900/70 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && !events.length && !error && (
        <div className="text-sm text-slate-400">Loading events…</div>
      )}

      <div className="crm-section-card flex-1 overflow-hidden p-0">
        <div className="flex-1 overflow-auto">
          <table className="crm-table min-w-full text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Title</th>
                <th>Details</th>
                <th>Calendar Link</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && !loading && !error && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500 text-sm border-r-0">
                    No events in the next 7 days.
                  </td>
                </tr>
              )}
              {events.map((ev) => {
                const start = ev.start?.dateTime || ev.start?.date;
                const end = ev.end?.dateTime || ev.end?.date;
                const startDate = start ? new Date(start) : null;
                const endDate = end ? new Date(end) : null;
                const dateLabel = startDate
                  ? startDate.toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })
                  : '-';
                const timeLabel =
                  startDate && endDate
                    ? `${startDate.toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit'
                      })} – ${endDate.toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}`
                    : '-';

                return (
                  <tr key={ev.id}>
                    <td className="whitespace-nowrap text-slate-100">{dateLabel}</td>
                    <td className="whitespace-nowrap text-slate-300">{timeLabel}</td>
                    <td className="text-slate-100">{ev.summary || 'service_request'}</td>
                    <td className="text-slate-400 whitespace-pre-line text-xs max-w-xs">
                      {ev.description || '-'}
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {ev.htmlLink ? (
                        <a
                          href={ev.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-medium text-sky-400 hover:text-sky-300 hover:underline"
                        >
                          Open in Google Calendar
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
    </div>
  );
}


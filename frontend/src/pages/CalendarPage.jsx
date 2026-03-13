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
    <div className="p-6 flex flex-col h-full space-y-4">
      <div>
        <h1 className="text-[20px] font-semibold text-crm-text">Service Calendar</h1>
        <p className="text-[13px] text-crm-text2">
          View `service_request` bookings pulled from Google Calendar for this dealer.
        </p>
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {loading && !events.length && !error && (
        <div className="text-sm text-crm-text2">Loading events…</div>
      )}

      <div className="flex-1 overflow-auto border border-gray-200 rounded-md bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Date</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Time</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Title</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Details</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Calendar Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {events.length === 0 && !loading && !error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">
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
                  <td className="px-4 py-2 whitespace-nowrap text-gray-900">{dateLabel}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-700">{timeLabel}</td>
                  <td className="px-4 py-2 text-gray-900">{ev.summary || 'service_request'}</td>
                  <td className="px-4 py-2 text-gray-600 whitespace-pre-line text-xs max-w-xs">
                    {ev.description || '-'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-blue-600 text-xs">
                    {ev.htmlLink ? (
                      <a href={ev.htmlLink} target="_blank" rel="noreferrer" className="hover:underline">
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
  );
}


import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiGetDealerConfigByPhone } from '../api';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export function DealershipInfoPage() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);
  const [savingHours, setSavingHours] = useState(false);
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ holiday_date: '', description: '' });
  const [holidays, setHolidays] = useState([]);
  const [deleteHolidayConfirm, setDeleteHolidayConfirm] = useState({ open: false, id: null });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dealerPhone = params.get('dealer_phone');
    if (!dealerPhone) {
      setError('No dealer DID provided. Go back to the entry page and enter a dealer number.');
      setConfig(null);
      return;
    }

    async function loadConfig() {
      setError('');
      setLoading(true);
      try {
        const data = await apiGetDealerConfigByPhone(dealerPhone.trim());
        setConfig(data);
        const dealerId = data.dealer_id;
        const res = await fetch(
          `/api/dealer/${dealerId}/holidays?dealer_phone=${encodeURIComponent(
            dealerPhone.trim()
          )}`
        );
        if (res.ok) {
          const list = await res.json();
          setHolidays(list || []);
        } else {
          setHolidays([]);
        }
      } catch (e) {
        setConfig(null);
        setError(e.message || 'Failed to load dealership info.');
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, [location.search]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-crm-text">Dealership Info</h1>
        <p className="text-[13px] text-crm-text2">
          Profile, departments, hours, and holidays for the selected dealership.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-[6px] px-3 py-2">
          {error}
        </div>
      )}

      {loading && !config && !error && (
        <div className="text-sm text-crm-text2">Loading dealership info…</div>
      )}

      {config && !error && (
        <div className="space-y-4">
          <div className="rounded-[6px] border border-crm-border bg-white p-4">
            <div className="text-[16px] font-semibold text-crm-text">{config.dealer_name}</div>
            <div className="mt-1 text-[13px] text-crm-text2">
              {config.address || ''}
              {config.city ? `, ${config.city}` : ''}
              {config.state ? `, ${config.state}` : ''}
              {config.country ? `, ${config.country}` : ''}
            </div>
            <div className="mt-1 text-[13px] text-crm-text2">
              DID: {config.primary_phone || '—'} · Timezone: {config.timezone || '—'}
            </div>
            {config.website_url && (
              <div className="mt-1 text-[13px]">
                <a
                  href={config.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Website
                </a>
              </div>
            )}
          </div>

          <div className="rounded-[6px] border border-crm-border bg-white p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[14px] font-semibold text-crm-text">Departments & Hours</div>
              <div className="text-[11px] text-crm-text2">
                Edit hours only. Dealer name and DID are managed by admin.
              </div>
            </div>
            <div className="space-y-3">
              {(config.departments || []).map((dept) => {
                const hours = dept.hours || [];
                const byDay = {};
                hours.forEach((h) => {
                  byDay[h.day] = h;
                });
                const days = [
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday',
                  'Sunday'
                ];
                const editableRows = days.map((day) => ({
                  day_of_week: day,
                  open_time: byDay[day]?.open || '',
                  close_time: byDay[day]?.close || '',
                  is_closed: !!byDay[day]?.is_closed
                }));

                const handleSaveDeptHours = async () => {
                  try {
                    setSavingHours(true);
                    const params = new URLSearchParams(location.search);
                    const dealerPhone = params.get('dealer_phone');
                    await fetch(
                      `/api/dealer/${config.dealer_id}/departments/${dept.id}/hours?dealer_phone=${encodeURIComponent(
                        dealerPhone || ''
                      )}`,
                      {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ hours: editableRows })
                      }
                    );
                  } finally {
                    setSavingHours(false);
                  }
                };

                return (
                  <div key={dept.id} className="border border-crm-border rounded-[6px] p-3">
                    <div className="text-[13px] font-medium text-crm-text mb-2">
                      {dept.name} ·{' '}
                      <span className="text-crm-text2">
                        {dept.transfer_phone || '—'} ({dept.transfer_type || '—'})
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-[12px]">
                        <thead>
                          <tr className="text-left text-gray-700">
                            <th className="px-2 py-1">Day</th>
                            <th className="px-2 py-1">Open</th>
                            <th className="px-2 py-1">Close</th>
                            <th className="px-2 py-1">Closed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editableRows.map((row) => (
                            <tr key={row.day_of_week}>
                              <td className="px-2 py-1">{row.day_of_week}</td>
                              <td className="px-2 py-1">
                                <input
                                  className="w-20 rounded-[4px] border border-crm-border px-1 py-0.5"
                                  defaultValue={row.open_time}
                                  onBlur={(e) => {
                                    row.open_time = e.target.value;
                                  }}
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  className="w-20 rounded-[4px] border border-crm-border px-1 py-0.5"
                                  defaultValue={row.close_time}
                                  onBlur={(e) => {
                                    row.close_time = e.target.value;
                                  }}
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="checkbox"
                                  defaultChecked={row.is_closed}
                                  onChange={(e) => {
                                    row.is_closed = e.target.checked;
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveDeptHours}
                      disabled={savingHours}
                      className="mt-2 rounded-[6px] border border-crm-border bg-white px-3 py-1 text-[12px] hover:bg-[#F3F4F6] disabled:opacity-60"
                    >
                      {savingHours ? 'Saving…' : 'Save Hours'}
                    </button>
                  </div>
                );
              })}
              {(config.departments || []).length === 0 && (
                <div className="text-[13px] text-crm-text2">No departments configured.</div>
              )}
            </div>
          </div>

          <div className="rounded-[6px] border border-crm-border bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[14px] font-semibold text-crm-text">Holidays</div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const params = new URLSearchParams(location.search);
                  const dealerPhone = params.get('dealer_phone');
                  if (!dealerPhone) {
                    setError('Missing dealer_phone. Use the dealer entry page to open CRM.');
                    return;
                  }
                  setSavingHoliday(true);
                  setError('');
                  try {
                    const res = await fetch(
                      `/api/dealer/${config.dealer_id}/holidays?dealer_phone=${encodeURIComponent(
                        dealerPhone
                      )}`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          holiday_date: newHoliday.holiday_date,
                          description: newHoliday.description || null,
                          is_closed: true
                        })
                      }
                    );
                    if (res.ok) {
                      const created = await res.json();
                      setHolidays((prev) => [...prev, created]);
                      setNewHoliday({ holiday_date: '', description: '' });
                    } else {
                      const errBody = await res.json().catch(() => ({}));
                      setError(errBody.error || `Failed to add holiday (${res.status})`);
                    }
                  } finally {
                    setSavingHoliday(false);
                  }
                }}
                className="flex items-center gap-2 text-[12px]"
              >
                <input
                  type="date"
                  className="rounded-[6px] border border-crm-border px-2 py-1 text-[12px]"
                  value={newHoliday.holiday_date}
                  onChange={(e) =>
                    setNewHoliday((prev) => ({ ...prev, holiday_date: e.target.value }))
                  }
                  required
                />
                <input
                  placeholder="Description"
                  className="rounded-[6px] border border-crm-border px-2 py-1 text-[12px]"
                  value={newHoliday.description}
                  onChange={(e) =>
                    setNewHoliday((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
                <button
                  type="submit"
                  disabled={savingHoliday}
                  className="rounded-[6px] border border-crm-border bg-white px-3 py-1 text-[12px] hover:bg-[#F3F4F6] disabled:opacity-60"
                >
                  Add
                </button>
              </form>
            </div>
            <div className="text-[12px] text-crm-text2 mb-2">
              Holidays configured here will be respected by the service booking and open/closed
              logic.
            </div>
            <table className="min-w-full text-[12px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-700">Date</th>
                  <th className="px-3 py-2 text-left text-gray-700">Description</th>
                  <th className="px-3 py-2 text-left text-gray-700">Closed</th>
                  <th className="px-3 py-2 text-left text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {holidays.map((h) => (
                  <tr key={h.id}>
                    <td className="px-3 py-2 text-gray-900">{h.holiday_date}</td>
                    <td className="px-3 py-2 text-gray-700">{h.description || '—'}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {h.is_closed ? 'Closed' : 'Open'}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      <button
                        type="button"
                        className="text-[12px] text-red-600 hover:underline"
                        onClick={() => setDeleteHolidayConfirm({ open: true, id: h.id })}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {holidays.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-center text-[12px] text-crm-text2"
                    >
                      No holidays configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteHolidayConfirm.open}
        onClose={() => setDeleteHolidayConfirm({ open: false, id: null })}
        onConfirm={async () => {
          const id = deleteHolidayConfirm.id;
          if (!id || !config) return;
          const params = new URLSearchParams(location.search);
          const dealerPhone = params.get('dealer_phone');
          const res = await fetch(
            `/api/dealer/${config.dealer_id}/holidays/${id}?dealer_phone=${encodeURIComponent(
              dealerPhone || ''
            )}`,
            { method: 'DELETE' }
          );
          if (res.ok) {
            setHolidays((prev) => prev.filter((row) => row.id !== id));
          }
        }}
        title="Delete Holiday"
        message="Delete this holiday? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
}


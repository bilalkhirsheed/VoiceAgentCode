import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import { apiGetDealerConfigByPhone } from '../api';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DatePicker } from '../components/ui/DatePicker';
import { useToast } from '../contexts/ToastContext';

function buildTimeOptions() {
  const options = [{ value: '', label: '--' }];
  for (let h = 0; h < 24; h += 1) {
    for (const m of [0, 30]) {
      const value = `${String(h).padStart(2, '0')}:${m === 0 ? '00' : '30'}`;
      const hour12 = ((h + 11) % 12) + 1;
      const ampm = h < 12 ? 'AM' : 'PM';
      const label = `${hour12}:${m === 0 ? '00' : '30'} ${ampm}`;
      options.push({ value, label });
    }
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();

export function DealershipInfoPage() {
  const toast = useToast();
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
        const msg = e.message || 'Failed to load dealership info.';
        setConfig(null);
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, [location.search, toast]);

  return (
    <div className="crm-page space-y-6">
      <div className="crm-page-header">
        <h1 className="crm-page-title">Dealership Info</h1>
        <p className="crm-page-subtitle">
          Profile, departments, hours, and holidays for the selected dealership.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-300 bg-red-950/40 border border-red-900/70 rounded-[10px] px-3 py-2">
          {error}
        </div>
      )}

      {loading && !config && !error && (
        <div className="text-sm text-slate-400">Loading dealership info…</div>
      )}

      {config && !error && (
        <div className="space-y-4">
          <div className="crm-section-card">
            <div className="text-[16px] font-semibold text-slate-50">{config.dealer_name}</div>
            <div className="mt-1 text-[13px] text-slate-400">
              {config.address || ''}
              {config.city ? `, ${config.city}` : ''}
              {config.state ? `, ${config.state}` : ''}
              {config.country ? `, ${config.country}` : ''}
            </div>
            <div className="mt-1 text-[13px] text-slate-400">
              DID: {config.primary_phone || '—'} · Timezone: {config.timezone || '—'}
            </div>
            {config.website_url && (
              <div className="mt-1 text-[13px]">
                <a
                  href={config.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:underline"
                >
                  Website
                </a>
              </div>
            )}
          </div>

          <div className="crm-section-card bg-slate-950/40 border border-slate-800 space-y-3 text-slate-200">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[14px] font-semibold text-slate-50">Departments & Hours</div>
              <div className="text-[11px] text-slate-400">
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
                const editableRows = days.map((day) => {
                  const open = byDay[day]?.open || '';
                  const close = byDay[day]?.close || '';
                  return {
                    day_of_week: day,
                    open_time: open ? String(open).slice(0, 5) : '',
                    close_time: close ? String(close).slice(0, 5) : '',
                    is_closed: !!byDay[day]?.is_closed
                  };
                });

                const handleSaveDeptHours = async () => {
                  try {
                    setSavingHours(true);
                    const params = new URLSearchParams(location.search);
                    const dealerPhone = params.get('dealer_phone');
                    const res = await fetch(
                      `/api/dealer/${config.dealer_id}/departments/${dept.id}/hours?dealer_phone=${encodeURIComponent(
                        dealerPhone || ''
                      )}`,
                      {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ hours: editableRows })
                      }
                    );
                    if (res.ok) {
                      toast.success('Working hours saved.');
                    } else {
                      const errBody = await res.json().catch(() => ({}));
                      toast.error(errBody.error || 'Failed to save hours');
                    }
                  } catch (e) {
                    toast.error(e.message || 'Failed to save hours');
                  } finally {
                    setSavingHours(false);
                  }
                };

                return (
                  <div key={dept.id} className="border border-slate-800 rounded-[6px] p-3 bg-slate-950/60">
                    <div className="text-[13px] font-medium text-slate-100 mb-2">
                      {dept.name} ·{' '}
                      <span className="text-slate-400">
                        {dept.transfer_phone || '—'} ({dept.transfer_type || '—'})
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="crm-table min-w-full text-[12px]">
                        <thead>
                          <tr>
                            <th>Day</th>
                            <th>Open</th>
                            <th>Close</th>
                            <th>Closed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editableRows.map((row) => (
                            <tr key={row.day_of_week}>
                              <td className="text-slate-100">{row.day_of_week}</td>
                              <td>
                                <select
                                  className="w-24 rounded-[4px] border border-slate-700 bg-slate-900 px-1 py-0.5 text-[12px] text-slate-100"
                                  defaultValue={row.open_time}
                                  onChange={(e) => {
                                    row.open_time = e.target.value;
                                  }}
                                >
                                  {TIME_OPTIONS.map((opt) => (
                                    <option key={opt.value || opt.label} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <select
                                  className="w-24 rounded-[4px] border border-slate-700 bg-slate-900 px-1 py-0.5 text-[12px] text-slate-100"
                                  defaultValue={row.close_time}
                                  onChange={(e) => {
                                    row.close_time = e.target.value;
                                  }}
                                >
                                  {TIME_OPTIONS.map((opt) => (
                                    <option key={opt.value || opt.label} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="checkbox"
                                  defaultChecked={row.is_closed}
                                  onChange={(e) => {
                                    row.is_closed = e.target.checked;
                                  }}
                                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500 focus:ring-offset-0 accent-sky-500"
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
                      className="mt-2 rounded-[6px] border border-crm-border bg-white px-3 py-1 text-[12px] text-slate-700 hover:bg-[#F3F4F6] disabled:opacity-60"
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

          <div className="crm-section-card space-y-4">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-50">Holidays</h3>
              <p className="mt-1 text-[12px] text-slate-400">
                Holidays configured here will be respected by the service booking and open/closed
                logic.
              </p>
            </div>
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
                    toast.success('Holiday added.');
                  } else {
                    const errBody = await res.json().catch(() => ({}));
                    const errMsg = errBody.error || `Failed to add holiday (${res.status})`;
                    setError(errMsg);
                    toast.error(errMsg);
                  }
                } catch (e) {
                  const msg = e.message || 'Failed to add holiday';
                  setError(msg);
                  toast.error(msg);
                } finally {
                  setSavingHoliday(false);
                }
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="w-[160px]">
                <label className="mb-1 block text-[11px] font-medium text-slate-400">Date</label>
                <DatePicker
                  value={newHoliday.holiday_date}
                  onChange={(v) =>
                    setNewHoliday((prev) => ({ ...prev, holiday_date: v }))
                  }
                  placeholder="mm/dd/yyyy"
                  id="dealer-holiday-date"
                />
              </div>
              <div className="min-w-[180px] flex-1">
                <label className="mb-1 block text-[11px] font-medium text-slate-400">Description</label>
                <input
                  placeholder="e.g. Christmas Holiday"
                  className="h-9 w-full rounded-[8px] border border-slate-600 bg-slate-800 px-3 text-[12px] text-slate-100 placeholder-slate-500"
                  value={newHoliday.description}
                  onChange={(e) =>
                    setNewHoliday((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>
              <button
                type="submit"
                disabled={savingHoliday}
                className="h-9 shrink-0 rounded-[8px] border border-sky-600 bg-sky-600 px-4 text-[12px] font-medium text-white hover:bg-sky-500 disabled:opacity-60 disabled:border-slate-600 disabled:bg-slate-800"
              >
                Add
              </button>
            </form>
            <div className="overflow-x-auto rounded-[8px] border border-slate-800 bg-slate-950/50">
              <table className="crm-table min-w-full text-[12px]">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Closed</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((h) => (
                    <tr key={h.id}>
                      <td className="text-slate-100">{h.holiday_date}</td>
                      <td className="text-slate-300">{h.description || '—'}</td>
                      <td>
                        {h.is_closed ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-200">
                            <span className="flex h-4 w-4 items-center justify-center rounded bg-sky-500/20 text-sky-400">
                              <Check className="h-3 w-3" strokeWidth={2.5} />
                            </span>
                            Closed
                          </span>
                        ) : (
                          <span className="text-slate-500">Open</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="text-[12px] text-red-400 hover:text-red-300 hover:underline"
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
                        className="px-4 py-6 text-center text-[12px] text-slate-500 border-r-0"
                      >
                        No holidays configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
          try {
            const res = await fetch(
              `/api/dealer/${config.dealer_id}/holidays/${id}?dealer_phone=${encodeURIComponent(
                dealerPhone || ''
              )}`,
              { method: 'DELETE' }
            );
            if (res.ok) {
              setHolidays((prev) => prev.filter((row) => row.id !== id));
              toast.success('Holiday deleted.');
            } else {
              const errBody = await res.json().catch(() => ({}));
              toast.error(errBody.error || 'Failed to delete holiday');
            }
          } catch (e) {
            toast.error(e.message || 'Failed to delete holiday');
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


import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DatePicker } from '../../components/ui/DatePicker';
import { TIME_OPTIONS } from '../../lib/timeOptions';
import { useToast } from '../../contexts/ToastContext';
import {
  apiAdminGetDealerDetail,
  apiAdminUpdateDealer,
  apiAdminCreateDepartment,
  apiAdminUpdateDepartment,
  apiAdminDeleteDepartment,
  apiAdminReplaceDepartmentHours,
  apiAdminListHolidays,
  apiAdminCreateHoliday,
  apiAdminUpdateHoliday,
  apiAdminDeleteHoliday
} from '../../api';

export function AdminDealerDetailPage() {
  const toast = useToast();
  const { dealerId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dealerConfig, setDealerConfig] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [savingDealer, setSavingDealer] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ holiday_date: '', description: '' });
  const [dealerPassword, setDealerPassword] = useState('');
  const [deleteDeptConfirm, setDeleteDeptConfirm] = useState({ open: false, id: null });
  const [deleteHolidayConfirm, setDeleteHolidayConfirm] = useState({ open: false, id: null });

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const detail = await apiAdminGetDealerDetail(dealerId);
        setDealerConfig(detail.dealer);
        const h = await apiAdminListHolidays(dealerId);
        setHolidays(h || []);
      } catch (e) {
        const msg = e.message || 'Failed to load dealer detail';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dealerId]);

  if (!dealerConfig) {
    if (error) {
      return (
        <div className="rounded-[10px] border border-red-900/70 bg-red-950/40 px-3 py-2 text-[12px] text-red-300">
          {error}
        </div>
      );
    }
    return <div className="text-sm text-slate-400">Loading dealer…</div>;
  }

  const inputClass = 'w-full rounded-[6px] border border-slate-600 bg-slate-800 px-3 py-2 text-[13px] text-slate-100 placeholder-slate-500';
  const labelClass = 'block text-[12px] font-medium text-slate-200 mb-1';

  async function handleSaveDealer() {
    setSavingDealer(true);
    try {
      const payload = {
        dealer_name: dealerConfig.dealer_name,
        primary_phone: dealerConfig.primary_phone,
        contact_email: dealerConfig.contact_email,
        timezone: dealerConfig.timezone,
        address: dealerConfig.address,
        city: dealerConfig.city,
        state: dealerConfig.state,
        country: dealerConfig.country,
        zip_code: dealerConfig.zip_code,
        website_url: dealerConfig.website_url
      };
      if (dealerPassword.trim()) payload.password = dealerPassword.trim();
      const updated = await apiAdminUpdateDealer(dealerId, payload);
      setDealerConfig((prev) => ({ ...prev, ...updated }));
      setDealerPassword('');
      toast.success('Dealer info saved.');
    } catch (e) {
      toast.error(e.message || 'Failed to save dealer');
    } finally {
      setSavingDealer(false);
    }
  }

  async function handleSaveDept(dept, updates) {
    try {
      const updated = await apiAdminUpdateDepartment(dept.id, updates);
      setDealerConfig((prev) => ({
        ...prev,
        departments: (prev.departments || []).map((d) =>
          d.id === dept.id ? { ...d, ...updated } : d
        )
      }));
      toast.success('Department updated.');
    } catch (e) {
      toast.error(e.message || 'Failed to update department');
    }
  }

  function openDeleteDeptConfirm(deptId) {
    setDeleteDeptConfirm({ open: true, id: deptId });
  }

  async function handleConfirmDeleteDept() {
    const deptId = deleteDeptConfirm.id;
    if (!deptId) return;
    try {
      await apiAdminDeleteDepartment(deptId);
      setDealerConfig((prev) => ({
        ...prev,
        departments: (prev.departments || []).filter((d) => d.id !== deptId)
      }));
      toast.success('Department deleted.');
    } catch (e) {
      toast.error(e.message || 'Failed to delete department');
    }
  }

  async function handleSaveHours(dept, hoursRows) {
    try {
      await apiAdminReplaceDepartmentHours(dept.id, hoursRows);
      setDealerConfig((prev) => ({
        ...prev,
        departments: (prev.departments || []).map((d) =>
          d.id === dept.id ? { ...d, hours: hoursRows } : d
        )
      }));
      toast.success('Working hours saved.');
    } catch (e) {
      toast.error(e.message || 'Failed to save hours');
    }
  }

  async function handleAddHoliday(e) {
    e.preventDefault();
    if (!newHoliday.holiday_date) return;
    try {
      const created = await apiAdminCreateHoliday(dealerId, {
        holiday_date: newHoliday.holiday_date,
        description: newHoliday.description,
        is_closed: true
      });
      setHolidays((prev) => [...prev, created]);
      setNewHoliday({ holiday_date: '', description: '' });
      toast.success('Holiday added.');
    } catch (er) {
      toast.error(er.message || 'Failed to create holiday');
    }
  }

  async function handleUpdateHoliday(h, updates) {
    try {
      const updated = await apiAdminUpdateHoliday(h.id, updates);
      setHolidays((prev) => prev.map((row) => (row.id === h.id ? updated : row)));
      toast.success('Holiday updated.');
    } catch (er) {
      toast.error(er.message || 'Failed to update holiday');
    }
  }

  function openDeleteHolidayConfirm(id) {
    setDeleteHolidayConfirm({ open: true, id });
  }

  async function handleConfirmDeleteHoliday() {
    const id = deleteHolidayConfirm.id;
    if (!id) return;
    try {
      await apiAdminDeleteHoliday(id);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
      toast.success('Holiday deleted.');
    } catch (er) {
      toast.error(er.message || 'Failed to delete holiday');
    }
  }

  const departments = dealerConfig?.departments || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link
          to="/admin/dealers"
          className="text-[13px] font-medium text-sky-400 hover:text-sky-300 hover:underline w-fit"
        >
          ← Back to Dealers
        </Link>
        <div className="crm-page-header">
          <h1 className="crm-page-title">Dealer: {dealerConfig?.dealer_name || '—'}</h1>
          <p className="crm-page-subtitle">
            Edit dealer profile, departments, working hours, and holidays.
          </p>
        </div>
      </div>

      {/* Dealer info */}
      <div className="crm-section-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              value={dealerConfig.dealer_name || ''}
              onChange={(e) =>
                setDealerConfig((prev) => ({ ...prev, dealer_name: e.target.value }))
              }
            />
          </div>
          <div>
            <label className={labelClass}>Primary Phone (DID)</label>
            <input
              className={inputClass}
              value={dealerConfig.primary_phone || ''}
              onChange={(e) =>
                setDealerConfig((prev) => ({ ...prev, primary_phone: e.target.value }))
              }
            />
          </div>
          <div>
            <label className={labelClass}>Timezone</label>
            <input
              className={inputClass}
              value={dealerConfig.timezone || ''}
              onChange={(e) =>
                setDealerConfig((prev) => ({ ...prev, timezone: e.target.value }))
              }
            />
          </div>
          <div>
            <label className={labelClass}>Dealer Contact Email</label>
            <input
              type="email"
              className={inputClass}
              value={dealerConfig.contact_email || ''}
              onChange={(e) =>
                setDealerConfig((prev) => ({ ...prev, contact_email: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Address</label>
            <input
              className={inputClass}
              value={dealerConfig.address || ''}
              onChange={(e) =>
                setDealerConfig((prev) => ({ ...prev, address: e.target.value }))
              }
            />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input
              className={inputClass}
              value={dealerConfig.city || ''}
              onChange={(e) => setDealerConfig((prev) => ({ ...prev, city: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input
              className={inputClass}
              value={dealerConfig.state || ''}
              onChange={(e) => setDealerConfig((prev) => ({ ...prev, state: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Country</label>
            <input
              className={inputClass}
              value={dealerConfig.country || ''}
              onChange={(e) =>
                setDealerConfig((prev) => ({ ...prev, country: e.target.value }))
              }
            />
          </div>
          <div>
            <label className={labelClass}>ZIP</label>
            <input
              className={inputClass}
              value={dealerConfig.zip_code || ''}
              onChange={(e) =>
                setDealerConfig((prev) => ({ ...prev, zip_code: e.target.value }))
              }
            />
          </div>
          <div>
            <label className={labelClass}>Website</label>
            <input
              className={inputClass}
              value={dealerConfig.website_url || ''}
              onChange={(e) =>
                setDealerConfig((prev) => ({ ...prev, website_url: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="pt-2">
          <label className={labelClass}>Dealer login password</label>
          <input
            type="password"
            className={`${inputClass} max-w-xs`}
            value={dealerPassword}
            onChange={(e) => setDealerPassword(e.target.value)}
            placeholder="Leave blank to keep current; set to allow dealer to sign in"
            autoComplete="new-password"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Set a password so this dealer can sign in at the CRM login page (dealer phone + password). Pakistan Demo Dealer: set this here then sign in with primary phone and this password.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveDealer}
          disabled={savingDealer}
          className="mt-2 rounded-[8px] border border-sky-600 bg-sky-600 px-3 py-2 text-[13px] font-medium text-white hover:bg-sky-500 disabled:opacity-60 disabled:border-slate-600 disabled:bg-slate-800"
        >
          {savingDealer ? 'Saving…' : 'Save Dealer Info'}
        </button>
      </div>

      {/* Departments and hours */}
      <div className="crm-section-card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[14px] font-semibold text-slate-50">Departments & Hours</div>
          <Link
            to={`/admin/dealers/${dealerId}/departments/new`}
            className="rounded-[8px] border border-sky-600 bg-sky-600 px-3 py-2 text-[12px] font-medium text-white hover:bg-sky-500"
          >
            Add Department
          </Link>
        </div>

        {departments.length === 0 && (
          <div className="text-[13px] text-slate-400">No departments yet. Add one above.</div>
        )}

        <div className="space-y-4">
          {departments.map((dept) => {
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

            return (
              <div key={dept.id} className="border border-slate-800 rounded-[6px] p-3 space-y-2 bg-slate-950/50">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-3 text-[13px] w-full">
                    <input
                      className="rounded-[6px] border border-slate-600 bg-slate-800 px-2 py-1 text-[13px] text-slate-100"
                      value={dept.name}
                      onChange={(e) =>
                        setDealerConfig((prev) => ({
                          ...prev,
                          departments: (prev.departments || []).map((d) =>
                            d.id === dept.id ? { ...d, name: e.target.value } : d
                          )
                        }))
                      }
                      onBlur={() => handleSaveDept(dept, { department_name: dept.name })}
                    />
                    <span className="text-slate-400">
                      Transfer: {dept.transfer_phone || '—'} ({dept.transfer_type || '—'})
                    </span>
                    <input
                      type="email"
                      className="min-w-[220px] rounded-[6px] border border-slate-600 bg-slate-800 px-2 py-1 text-[13px] text-slate-100"
                      value={dept.contact_email || ''}
                      placeholder="Department contact email"
                      onChange={(e) =>
                        setDealerConfig((prev) => ({
                          ...prev,
                          departments: (prev.departments || []).map((d) =>
                            d.id === dept.id ? { ...d, contact_email: e.target.value } : d
                          )
                        }))
                      }
                      onBlur={() => handleSaveDept(dept, { contact_email: dept.contact_email || null })}
                    />
                  </div>
                  <button
                    type="button"
                    className="text-[12px] text-red-400 hover:underline"
                    onClick={() => openDeleteDeptConfirm(dept.id)}
                  >
                    Delete
                  </button>
                </div>
                <div className="overflow-x-auto rounded-[6px] border border-slate-800 bg-slate-950/50">
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
                      {editableRows.map((row, idx) => (
                        <tr key={row.day_of_week}>
                          <td className="text-slate-100">{row.day_of_week}</td>
                          <td>
                            <select
                              className="w-28 rounded-[6px] border border-slate-600 bg-slate-800 px-2 py-1.5 text-[12px] text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                              value={row.open_time || ''}
                              onChange={(e) => {
                                const nextRows = editableRows.map((r, i) =>
                                  i === idx ? { ...r, open_time: e.target.value } : r
                                );
                                const newHours = nextRows.map((r) => ({
                                  day: r.day_of_week,
                                  open: r.open_time,
                                  close: r.close_time,
                                  is_closed: r.is_closed
                                }));
                                setDealerConfig((prev) => ({
                                  ...prev,
                                  departments: (prev.departments || []).map((d) =>
                                    d.id === dept.id ? { ...d, hours: newHours } : d
                                  )
                                }));
                              }}
                            >
                              <option value="">—</option>
                              {TIME_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="w-28 rounded-[6px] border border-slate-600 bg-slate-800 px-2 py-1.5 text-[12px] text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                              value={row.close_time || ''}
                              onChange={(e) => {
                                const nextRows = editableRows.map((r, i) =>
                                  i === idx ? { ...r, close_time: e.target.value } : r
                                );
                                const newHours = nextRows.map((r) => ({
                                  day: r.day_of_week,
                                  open: r.open_time,
                                  close: r.close_time,
                                  is_closed: r.is_closed
                                }));
                                setDealerConfig((prev) => ({
                                  ...prev,
                                  departments: (prev.departments || []).map((d) =>
                                    d.id === dept.id ? { ...d, hours: newHours } : d
                                  )
                                }));
                              }}
                            >
                              <option value="">—</option>
                              {TIME_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={row.is_closed}
                              onChange={() => {
                                const nextRows = editableRows.map((r, i) =>
                                  i === idx ? { ...r, is_closed: !r.is_closed } : r
                                );
                                const newHours = nextRows.map((r) => ({
                                  day: r.day_of_week,
                                  open: r.open_time,
                                  close: r.close_time,
                                  is_closed: r.is_closed
                                }));
                                setDealerConfig((prev) => ({
                                  ...prev,
                                  departments: (prev.departments || []).map((d) =>
                                    d.id === dept.id ? { ...d, hours: newHours } : d
                                  )
                                }));
                              }}
                              className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-sky-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  className="mt-2 rounded-[6px] border border-slate-600 bg-slate-800 px-3 py-1.5 text-[12px] text-slate-100 hover:bg-slate-700"
                  onClick={() => handleSaveHours(dept, editableRows)}
                >
                  Save Hours
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Holidays */}
      <div className="crm-section-card space-y-4">
        <div>
          <h3 className="text-[14px] font-semibold text-slate-50">Holidays</h3>
          <p className="mt-1 text-[12px] text-slate-400">
            Holidays configured here will be respected by the service booking and open/closed logic.
          </p>
        </div>
        <form onSubmit={handleAddHoliday} className="flex flex-wrap items-end gap-3">
          <div className="w-[160px]">
            <label className="mb-1 block text-[11px] font-medium text-slate-400">Date</label>
            <DatePicker
              value={newHoliday.holiday_date}
              onChange={(v) => setNewHoliday((prev) => ({ ...prev, holiday_date: v }))}
              placeholder="mm/dd/yyyy"
              id="admin-holiday-date"
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-[11px] font-medium text-slate-400">Description</label>
            <input
              placeholder="e.g. Christmas Holiday"
              className="h-9 w-full rounded-[8px] border border-slate-600 bg-slate-800 px-3 text-[13px] text-slate-100 placeholder-slate-500"
              value={newHoliday.description}
              onChange={(e) =>
                setNewHoliday((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </div>
          <button
            type="submit"
            className="h-9 shrink-0 rounded-[8px] border border-sky-600 bg-sky-600 px-4 text-[12px] font-medium text-white hover:bg-sky-500"
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
                  <td>
                    <input
                      className="w-full rounded-[4px] border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                      defaultValue={h.description || ''}
                      onBlur={(e) => handleUpdateHoliday(h, { description: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      defaultChecked={h.is_closed}
                      onChange={(e) => handleUpdateHoliday(h, { is_closed: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-sky-500"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="text-[12px] text-red-400 hover:underline"
                      onClick={() => openDeleteHolidayConfirm(h.id)}
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
                    className="px-4 py-6 text-center text-[13px] text-slate-500 border-r-0"
                  >
                    No holidays configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={deleteDeptConfirm.open}
        onClose={() => setDeleteDeptConfirm({ open: false, id: null })}
        onConfirm={handleConfirmDeleteDept}
        title="Delete Department"
        message="Delete this department and its working hours? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
      <ConfirmDialog
        open={deleteHolidayConfirm.open}
        onClose={() => setDeleteHolidayConfirm({ open: false, id: null })}
        onConfirm={handleConfirmDeleteHoliday}
        title="Delete Holiday"
        message="Delete this holiday? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
}


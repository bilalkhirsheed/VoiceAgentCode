import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
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
  const { dealerId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dealerConfig, setDealerConfig] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [savingDealer, setSavingDealer] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ holiday_date: '', description: '' });
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
        setError(e.message || 'Failed to load dealer detail');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dealerId]);

  if (!dealerConfig) {
    if (error) {
      return (
        <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {error}
        </div>
      );
    }
    return <div className="text-sm text-crm-text2">Loading dealer…</div>;
  }

  async function handleSaveDealer() {
    setSavingDealer(true);
    try {
      const updated = await apiAdminUpdateDealer(dealerId, {
        dealer_name: dealerConfig.dealer_name,
        primary_phone: dealerConfig.primary_phone,
        timezone: dealerConfig.timezone,
        address: dealerConfig.address,
        city: dealerConfig.city,
        state: dealerConfig.state,
        country: dealerConfig.country,
        zip_code: dealerConfig.zip_code,
        website_url: dealerConfig.website_url
      });
      setDealerConfig((prev) => ({ ...prev, ...updated }));
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message || 'Failed to save dealer');
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
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message || 'Failed to update department');
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
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message || 'Failed to delete department');
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
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message || 'Failed to save hours');
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
    } catch (er) {
      // eslint-disable-next-line no-alert
      alert(er.message || 'Failed to create holiday');
    }
  }

  async function handleUpdateHoliday(h, updates) {
    try {
      const updated = await apiAdminUpdateHoliday(h.id, updates);
      setHolidays((prev) => prev.map((row) => (row.id === h.id ? updated : row)));
    } catch (er) {
      // eslint-disable-next-line no-alert
      alert(er.message || 'Failed to update holiday');
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
    } catch (er) {
      // eslint-disable-next-line no-alert
      alert(er.message || 'Failed to delete holiday');
    }
  }

  const departments = dealerConfig?.departments || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold text-crm-text">
          Dealer: {dealerConfig?.dealer_name || '—'}
        </h1>
        <p className="text-[13px] text-crm-text2">
          Edit dealer profile, departments, working hours, and holidays.
        </p>
      </div>

      {/* Dealer info */}
      <div className="rounded-[8px] border border-crm-border bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-crm-text mb-1">Name</label>
            <input
              className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
              value={dealerConfig.dealer_name || ''}
              onChange={(e) =>
                setDealerConfig((prev) => ({ ...prev, dealer_name: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-crm-text mb-1">
              Primary Phone (DID)
            </label>
            <input
              className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
              value={dealerConfig.primary_phone || ''}
              onChange={(e) =>
                setDealerConfig((prev) => ({ ...prev, primary_phone: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-crm-text mb-1">Timezone</label>
            <input
              className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
              value={dealerConfig.timezone || ''}
              onChange={(e) =>
                setDealerConfig((prev) => ({ ...prev, timezone: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-crm-text mb-1">Address</label>
            <input
              className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
              value={dealerConfig.address || ''}
              onChange={(e) =>
                setDealerConfig((prev) => ({ ...prev, address: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-crm-text mb-1">City</label>
            <input
              className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
              value={dealerConfig.city || ''}
              onChange={(e) => setDealerConfig((prev) => ({ ...prev, city: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-crm-text mb-1">State</label>
            <input
              className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
              value={dealerConfig.state || ''}
              onChange={(e) => setDealerConfig((prev) => ({ ...prev, state: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-crm-text mb-1">Country</label>
            <input
              className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
              value={dealerConfig.country || ''}
              onChange={(e) =>
                setDealerConfig((prev) => ({ ...prev, country: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-crm-text mb-1">ZIP</label>
            <input
              className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
              value={dealerConfig.zip_code || ''}
              onChange={(e) =>
                setDealerConfig((prev) => ({ ...prev, zip_code: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-crm-text mb-1">Website</label>
            <input
              className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
              value={dealerConfig.website_url || ''}
              onChange={(e) =>
                setDealerConfig((prev) => ({ ...prev, website_url: e.target.value }))
              }
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleSaveDealer}
          disabled={savingDealer}
          className="mt-2 rounded-[6px] bg-crm-primary px-3 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {savingDealer ? 'Saving…' : 'Save Dealer Info'}
        </button>
      </div>

      {/* Departments and hours */}
      <div className="rounded-[8px] border border-crm-border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[14px] font-semibold text-crm-text">Departments & Hours</div>
          <Link
            to={`/admin/dealers/${dealerId}/departments/new`}
            className="rounded-[6px] bg-crm-primary px-3 py-2 text-[12px] font-medium text-white hover:bg-blue-700"
          >
            Add Department
          </Link>
        </div>

        {departments.length === 0 && (
          <div className="text-[13px] text-crm-text2">No departments yet. Add one above.</div>
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
              <div key={dept.id} className="border border-crm-border rounded-[6px] p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-3 text-[13px]">
                    <input
                      className="rounded-[6px] border border-crm-border px-2 py-1 text-[13px]"
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
                    <span className="text-crm-text2">
                      Transfer: {dept.transfer_phone || '—'} ({dept.transfer_type || '—'})
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-[12px] text-red-600 hover:underline"
                    onClick={() => openDeleteDeptConfirm(dept.id)}
                  >
                    Delete
                  </button>
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
                      {editableRows.map((row, idx) => (
                        <tr key={row.day_of_week}>
                          <td className="px-2 py-1">{row.day_of_week}</td>
                          <td className="px-2 py-1">
                            <input
                              className="w-24 rounded-[4px] border border-crm-border px-1 py-0.5"
                              value={row.open_time}
                              onChange={(e) => {
                                const next = [...editableRows];
                                next[idx].open_time = e.target.value;
                              }}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              className="w-24 rounded-[4px] border border-crm-border px-1 py-0.5"
                              value={row.close_time}
                              onChange={(e) => {
                                const next = [...editableRows];
                                next[idx].close_time = e.target.value;
                              }}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="checkbox"
                              checked={row.is_closed}
                              onChange={() => {
                                const next = [...editableRows];
                                next[idx].is_closed = !next[idx].is_closed;
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
                  className="mt-2 rounded-[6px] border border-crm-border bg-white px-3 py-1 text-[12px] hover:bg-[#F3F4F6]"
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
      <div className="rounded-[8px] border border-crm-border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[14px] font-semibold text-crm-text">Holidays</div>
          <form onSubmit={handleAddHoliday} className="flex items-center gap-2 text-[13px]">
            <input
              type="date"
              className="rounded-[6px] border border-crm-border px-2 py-1 text-[13px]"
              value={newHoliday.holiday_date}
              onChange={(e) =>
                setNewHoliday((prev) => ({ ...prev, holiday_date: e.target.value }))
              }
              required
            />
            <input
              placeholder="Description"
              className="rounded-[6px] border border-crm-border px-2 py-1 text-[13px]"
              value={newHoliday.description}
              onChange={(e) =>
                setNewHoliday((prev) => ({ ...prev, description: e.target.value }))
              }
            />
            <button
              type="submit"
              className="rounded-[6px] border border-crm-border bg-white px-3 py-1 text-[12px] hover:bg-[#F3F4F6]"
            >
              Add
            </button>
          </form>
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
                <td className="px-3 py-2 text-gray-700">
                  <input
                    className="w-full rounded-[4px] border border-crm-border px-2 py-1"
                    defaultValue={h.description || ''}
                    onBlur={(e) => handleUpdateHoliday(h, { description: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2 text-gray-700">
                  <input
                    type="checkbox"
                    defaultChecked={h.is_closed}
                    onChange={(e) => handleUpdateHoliday(h, { is_closed: e.target.checked })}
                  />
                </td>
                <td className="px-3 py-2 text-gray-700">
                  <button
                    type="button"
                    className="text-[12px] text-red-600 hover:underline"
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
                  className="px-3 py-4 text-center text-[13px] text-crm-text2"
                >
                  No holidays configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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


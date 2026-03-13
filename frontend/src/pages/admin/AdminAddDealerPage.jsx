import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiAdminCreateDealer,
  apiAdminGetDealerDetail,
  apiAdminUpdateDepartment,
  apiAdminReplaceDepartmentHours,
  apiAdminCreateHoliday
} from '../../api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const emptyHours = () =>
  DAYS.map((day) => ({
    day_of_week: day,
    open_time: '09:00',
    close_time: '17:00',
    is_closed: day === 'Sunday'
  }));

export function AdminAddDealerPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [primary, setPrimary] = useState({
    dealer_name: '',
    primary_phone: '',
    timezone: 'Asia/Karachi',
    address: '',
    city: '',
    state: '',
    country: '',
    zip_code: '',
    website_url: ''
  });

  const [dealerId, setDealerId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [holidays, setHolidays] = useState([{ holiday_date: '', description: '', is_closed: true }]);

  async function handleCreateDealer(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const created = await apiAdminCreateDealer({
        dealer_name: primary.dealer_name,
        primary_phone: primary.primary_phone,
        timezone: primary.timezone,
        address: primary.address || undefined,
        city: primary.city || undefined,
        state: primary.state || undefined,
        country: primary.country || undefined,
        zip_code: primary.zip_code || undefined,
        website_url: primary.website_url || undefined
      });
      setDealerId(created.id);

      const detail = await apiAdminGetDealerDetail(created.id);
      const depts = (detail.dealer?.departments || []).map((d) => ({
        ...d,
        transfer_phone: '',
        hours: (d.hours || []).length
          ? DAYS.map((day) => {
              const h = (d.hours || []).find((x) => x.day === day);
              return {
                day_of_week: day,
                open_time: h?.open || '09:00',
                close_time: h?.close || '17:00',
                is_closed: !!h?.is_closed
              };
            })
          : emptyHours()
      }));
      setDepartments(depts);
      setStep(2);
    } catch (e) {
      setError(e.message || 'Failed to create dealer');
    } finally {
      setLoading(false);
    }
  }

  function updateDept(deptIndex, field, value) {
    setDepartments((prev) =>
      prev.map((d, i) => (i === deptIndex ? { ...d, [field]: value } : d))
    );
  }

  function updateDeptHour(deptIndex, dayIdx, field, value) {
    setDepartments((prev) =>
      prev.map((d, i) => {
        if (i !== deptIndex) return d;
        const nextHours = [...(d.hours || emptyHours())];
        nextHours[dayIdx] = { ...nextHours[dayIdx], [field]: value };
        return { ...d, hours: nextHours };
      })
    );
  }

  function addHoliday() {
    setHolidays((prev) => [...prev, { holiday_date: '', description: '', is_closed: true }]);
  }

  function updateHoliday(idx, field, value) {
    setHolidays((prev) =>
      prev.map((h, i) => (i === idx ? { ...h, [field]: value } : h))
    );
  }

  function removeHoliday(idx) {
    setHolidays((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleCompleteSetup(e) {
    e.preventDefault();
    if (!dealerId) return;
    setLoading(true);
    setError('');
    try {
      for (const dept of departments) {
        if (dept.transfer_phone)
          await apiAdminUpdateDepartment(dept.id, { transfer_phone: dept.transfer_phone });
        const hours = (dept.hours || emptyHours()).map((h) => ({
          day_of_week: h.day_of_week,
          open_time: h.open_time || null,
          close_time: h.close_time || null,
          is_closed: !!h.is_closed
        }));
        await apiAdminReplaceDepartmentHours(dept.id, hours);
      }
      for (const h of holidays) {
        if (h.holiday_date)
          await apiAdminCreateHoliday(dealerId, {
            holiday_date: h.holiday_date,
            description: h.description || null,
            is_closed: h.is_closed ?? true
          });
      }
      navigate(`/admin/dealers/${dealerId}`);
    } catch (e) {
      setError(e.message || 'Failed to save departments/holidays');
    } finally {
      setLoading(false);
    }
  }

  if (step === 1) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-[18px] font-semibold text-crm-text">Add Dealer</h1>
          <p className="text-[13px] text-crm-text2">
            Step 1 of 2: Enter primary dealer details. You will then configure departments,
            transfer phones, hours, and holidays.
          </p>
        </div>

        {error && (
          <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateDealer} className="rounded-[8px] border border-crm-border bg-white p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-crm-text mb-1">Name *</label>
              <input
                className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
                value={primary.dealer_name}
                onChange={(e) => setPrimary((p) => ({ ...p, dealer_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-crm-text mb-1">
                Primary Phone (DID) *
              </label>
              <input
                className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
                value={primary.primary_phone}
                onChange={(e) => setPrimary((p) => ({ ...p, primary_phone: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-crm-text mb-1">Timezone *</label>
              <input
                className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
                value={primary.timezone}
                onChange={(e) => setPrimary((p) => ({ ...p, timezone: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-crm-text mb-1">Address</label>
              <input
                className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
                value={primary.address}
                onChange={(e) => setPrimary((p) => ({ ...p, address: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-crm-text mb-1">City</label>
              <input
                className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
                value={primary.city}
                onChange={(e) => setPrimary((p) => ({ ...p, city: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-crm-text mb-1">State</label>
              <input
                className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
                value={primary.state}
                onChange={(e) => setPrimary((p) => ({ ...p, state: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-crm-text mb-1">Country</label>
              <input
                className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
                value={primary.country}
                onChange={(e) => setPrimary((p) => ({ ...p, country: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-crm-text mb-1">ZIP</label>
              <input
                className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
                value={primary.zip_code}
                onChange={(e) => setPrimary((p) => ({ ...p, zip_code: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-crm-text mb-1">Website</label>
              <input
                className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
                value={primary.website_url}
                onChange={(e) => setPrimary((p) => ({ ...p, website_url: e.target.value }))}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-[6px] bg-crm-primary px-3 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Creating…' : 'Create Dealer & Continue to Departments'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold text-crm-text">Add Dealer – Departments & Holidays</h1>
        <p className="text-[13px] text-crm-text2">
          Step 2 of 2: Configure transfer phones, working hours, and holidays for{' '}
          {primary.dealer_name}.
        </p>
      </div>

      {error && (
        <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleCompleteSetup} className="space-y-5">
        {departments.map((dept, deptIdx) => (
          <div
            key={dept.id}
            className="rounded-[8px] border border-crm-border bg-white p-4 space-y-3"
          >
            <div className="font-semibold text-[14px] text-crm-text">{dept.name || dept.department_name}</div>
            <div>
              <label className="block text-[12px] font-medium text-crm-text mb-1">
                Transfer Phone
              </label>
              <input
                className="w-full max-w-xs rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
                placeholder="e.g. +1234567890"
                value={dept.transfer_phone || ''}
                onChange={(e) => updateDept(deptIdx, 'transfer_phone', e.target.value)}
              />
            </div>
            <div>
              <div className="text-[12px] font-medium text-crm-text mb-2">Working Hours</div>
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
                    {(dept.hours || emptyHours()).map((row, dayIdx) => (
                      <tr key={row.day_of_week}>
                        <td className="px-2 py-1">{row.day_of_week}</td>
                        <td className="px-2 py-1">
                          <input
                            type="time"
                            className="w-24 rounded-[4px] border border-crm-border px-1 py-0.5"
                            value={row.open_time || ''}
                            onChange={(e) =>
                              updateDeptHour(deptIdx, dayIdx, 'open_time', e.target.value)
                            }
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="time"
                            className="w-24 rounded-[4px] border border-crm-border px-1 py-0.5"
                            value={row.close_time || ''}
                            onChange={(e) =>
                              updateDeptHour(deptIdx, dayIdx, 'close_time', e.target.value)
                            }
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="checkbox"
                            checked={!!row.is_closed}
                            onChange={(e) =>
                              updateDeptHour(deptIdx, dayIdx, 'is_closed', e.target.checked)
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}

        <div className="rounded-[8px] border border-crm-border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[14px] font-semibold text-crm-text">Holidays</div>
            <button
              type="button"
              onClick={addHoliday}
              className="rounded-[6px] border border-crm-border bg-white px-3 py-1 text-[12px] hover:bg-[#F3F4F6]"
            >
              Add Holiday
            </button>
          </div>
          {holidays.map((h, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2 text-[13px]">
              <input
                type="date"
                className="rounded-[6px] border border-crm-border px-2 py-1"
                value={h.holiday_date}
                onChange={(e) => updateHoliday(idx, 'holiday_date', e.target.value)}
              />
              <input
                placeholder="Description"
                className="rounded-[6px] border border-crm-border px-2 py-1"
                value={h.description}
                onChange={(e) => updateHoliday(idx, 'description', e.target.value)}
              />
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={!!h.is_closed}
                  onChange={(e) => updateHoliday(idx, 'is_closed', e.target.checked)}
                />
                Closed
              </label>
              <button
                type="button"
                onClick={() => removeHoliday(idx)}
                className="text-[12px] text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-[6px] bg-crm-primary px-3 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Complete Setup'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/admin/dealers/${dealerId}`)}
            className="rounded-[6px] border border-crm-border bg-white px-3 py-2 text-[13px] text-crm-text2 hover:bg-[#F3F4F6]"
          >
            Skip & View Dealer
          </button>
        </div>
      </form>
    </div>
  );
}

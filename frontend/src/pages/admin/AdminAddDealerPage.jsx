import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiAdminCreateDealer,
  apiAdminGetDealerDetail,
  apiAdminUpdateDepartment,
  apiAdminReplaceDepartmentHours,
  apiAdminCreateHoliday
} from '../../api';
import { DatePicker } from '../../components/ui/DatePicker';
import { TIME_OPTIONS } from '../../lib/timeOptions';
import { useToast } from '../../contexts/ToastContext';

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
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [primary, setPrimary] = useState({
    dealer_name: '',
    primary_phone: '',
    contact_email: '',
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
        contact_email: primary.contact_email || undefined,
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
        contact_email: d.contact_email || '',
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
        await apiAdminUpdateDepartment(dept.id, {
          transfer_phone: dept.transfer_phone || null,
          contact_email: dept.contact_email || null
        });
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
      toast.success('Dealer setup complete.');
      navigate(`/admin/dealers/${dealerId}`);
    } catch (e) {
      const msg = e.message || 'Failed to save departments/holidays';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full rounded-[6px] border border-slate-600 bg-slate-800 px-3 py-2 text-[13px] text-slate-100 placeholder-slate-500';
  const labelClass = 'block text-[12px] font-medium text-slate-200 mb-1';

  if (step === 1) {
    return (
      <div className="space-y-6">
        <div className="crm-page-header">
          <h1 className="crm-page-title">Add Dealer</h1>
          <p className="crm-page-subtitle">
            Step 1 of 2: Enter primary dealer details. You will then configure departments,
            transfer phones, hours, and holidays.
          </p>
        </div>

        {error && (
          <div className="rounded-[10px] border border-red-900/70 bg-red-950/40 px-3 py-2 text-[12px] text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateDealer} className="crm-section-card space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Name *</label>
              <input
                className={inputClass}
                value={primary.dealer_name}
                onChange={(e) => setPrimary((p) => ({ ...p, dealer_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Primary Phone (DID) *</label>
              <input
                className={inputClass}
                value={primary.primary_phone}
                onChange={(e) => setPrimary((p) => ({ ...p, primary_phone: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Timezone *</label>
              <input
                className={inputClass}
                value={primary.timezone}
                onChange={(e) => setPrimary((p) => ({ ...p, timezone: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Dealer Contact Email</label>
              <input
                type="email"
                className={inputClass}
                value={primary.contact_email}
                onChange={(e) => setPrimary((p) => ({ ...p, contact_email: e.target.value }))}
                placeholder="dealer@example.com"
              />
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <input
                className={inputClass}
                value={primary.address}
                onChange={(e) => setPrimary((p) => ({ ...p, address: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input
                className={inputClass}
                value={primary.city}
                onChange={(e) => setPrimary((p) => ({ ...p, city: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>State</label>
              <input
                className={inputClass}
                value={primary.state}
                onChange={(e) => setPrimary((p) => ({ ...p, state: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input
                className={inputClass}
                value={primary.country}
                onChange={(e) => setPrimary((p) => ({ ...p, country: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>ZIP</label>
              <input
                className={inputClass}
                value={primary.zip_code}
                onChange={(e) => setPrimary((p) => ({ ...p, zip_code: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Website</label>
              <input
                className={inputClass}
                value={primary.website_url}
                onChange={(e) => setPrimary((p) => ({ ...p, website_url: e.target.value }))}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-[8px] border border-sky-600 bg-sky-600 px-3 py-2 text-[13px] font-medium text-white hover:bg-sky-500 disabled:opacity-60 disabled:border-slate-600 disabled:bg-slate-800"
          >
            {loading ? 'Creating…' : 'Create Dealer & Continue to Departments'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="crm-page-header">
        <h1 className="crm-page-title">Add Dealer – Departments & Holidays</h1>
        <p className="crm-page-subtitle">
          Step 2 of 2: Configure transfer phones, working hours, and holidays for{' '}
          {primary.dealer_name}.
        </p>
      </div>

      {error && (
        <div className="rounded-[10px] border border-red-900/70 bg-red-950/40 px-3 py-2 text-[12px] text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleCompleteSetup} className="space-y-5">
        {departments.map((dept, deptIdx) => (
          <div
            key={dept.id}
            className="crm-section-card space-y-3"
          >
            <div className="font-semibold text-[14px] text-slate-50">{dept.name || dept.department_name}</div>
            <div>
              <label className={labelClass}>Transfer Phone</label>
              <input
                className={`${inputClass} max-w-xs`}
                placeholder="e.g. +1234567890"
                value={dept.transfer_phone || ''}
                onChange={(e) => updateDept(deptIdx, 'transfer_phone', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Department Contact Email</label>
              <input
                type="email"
                className={`${inputClass} max-w-xs`}
                placeholder="service@example.com"
                value={dept.contact_email || ''}
                onChange={(e) => updateDept(deptIdx, 'contact_email', e.target.value)}
              />
            </div>
            <div>
              <div className="text-[12px] font-medium text-slate-200 mb-2">Working Hours</div>
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
                    {(dept.hours || emptyHours()).map((row, dayIdx) => (
                      <tr key={row.day_of_week}>
                        <td className="text-slate-100">{row.day_of_week}</td>
                        <td>
                          <select
                            className="w-28 rounded-[6px] border border-slate-600 bg-slate-800 px-2 py-1.5 text-[12px] text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                            value={row.open_time || ''}
                            onChange={(e) =>
                              updateDeptHour(deptIdx, dayIdx, 'open_time', e.target.value)
                            }
                          >
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
                            onChange={(e) =>
                              updateDeptHour(deptIdx, dayIdx, 'close_time', e.target.value)
                            }
                          >
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
                            checked={!!row.is_closed}
                            onChange={(e) =>
                              updateDeptHour(deptIdx, dayIdx, 'is_closed', e.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-sky-500"
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

        <div className="crm-section-card space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[14px] font-semibold text-slate-50">Holidays</div>
            <button
              type="button"
              onClick={addHoliday}
              className="rounded-[6px] border border-slate-600 bg-slate-800 px-3 py-1.5 text-[12px] text-slate-100 hover:bg-slate-700"
            >
              Add Holiday
            </button>
          </div>
          {holidays.map((h, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2 text-[13px]">
              <div className="min-w-[140px]">
                <DatePicker
                  value={h.holiday_date}
                  onChange={(v) => updateHoliday(idx, 'holiday_date', v)}
                  placeholder="mm/dd/yyyy"
                  id={`admin-add-dealer-holiday-${idx}`}
                />
              </div>
              <input
                placeholder="Description"
                className="rounded-[6px] border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-100 placeholder-slate-500"
                value={h.description}
                onChange={(e) => updateHoliday(idx, 'description', e.target.value)}
              />
              <label className="flex items-center gap-1.5 text-slate-200">
                <input
                  type="checkbox"
                  checked={!!h.is_closed}
                  onChange={(e) => updateHoliday(idx, 'is_closed', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-sky-500"
                />
                Closed
              </label>
              <button
                type="button"
                onClick={() => removeHoliday(idx)}
                className="text-[12px] text-red-400 hover:underline"
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
            className="rounded-[8px] border border-sky-600 bg-sky-600 px-3 py-2 text-[13px] font-medium text-white hover:bg-sky-500 disabled:opacity-60 disabled:border-slate-600 disabled:bg-slate-800"
          >
            {loading ? 'Saving…' : 'Complete Setup'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/admin/dealers/${dealerId}`)}
            className="rounded-[8px] border border-slate-600 bg-slate-800 px-3 py-2 text-[13px] font-medium text-slate-100 hover:bg-slate-700"
          >
            Skip & View Dealer
          </button>
        </div>
      </form>
    </div>
  );
}

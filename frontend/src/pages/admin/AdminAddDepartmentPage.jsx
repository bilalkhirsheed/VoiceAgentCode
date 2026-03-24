import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  apiAdminGetDealerDetail,
  apiAdminCreateDepartment,
  apiAdminReplaceDepartmentHours
} from '../../api';
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

export function AdminAddDepartmentPage() {
  const { dealerId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dealerName, setDealerName] = useState('');

  const [department_name, setDepartmentName] = useState('');
  const [transfer_phone, setTransferPhone] = useState('');
  const [transfer_type, setTransferType] = useState('pstn');
  const [hours, setHours] = useState(emptyHours());

  useEffect(() => {
    async function load() {
      try {
        const detail = await apiAdminGetDealerDetail(dealerId);
        setDealerName(detail.dealer?.dealer_name || 'Dealer');
      } catch (e) {
        const msg = e.message || 'Failed to load dealer';
        setError(msg);
        toast.error(msg);
      }
    }
    load();
  }, [dealerId, toast]);

  function updateHour(dayIdx, field, value) {
    setHours((prev) => {
      const next = [...prev];
      next[dayIdx] = { ...next[dayIdx], [field]: value };
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const name = department_name.trim();
    if (!name) {
      toast.error('Department name is required');
      setError('Department name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const created = await apiAdminCreateDepartment(dealerId, {
        department_name: name,
        transfer_phone: transfer_phone.trim() || null,
        transfer_type: transfer_type || null
      });
      const hoursPayload = hours.map((h) => ({
        day_of_week: h.day_of_week,
        open_time: h.open_time || null,
        close_time: h.close_time || null,
        is_closed: !!h.is_closed
      }));
      await apiAdminReplaceDepartmentHours(created.id, hoursPayload);
      toast.success('Department created.');
      navigate(`/admin/dealers/${dealerId}`);
    } catch (e) {
      const msg = e.message || 'Failed to create department';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full max-w-xs rounded-[6px] border border-slate-600 bg-slate-800 px-3 py-2 text-[13px] text-slate-100 placeholder-slate-500';
  const labelClass = 'block text-[12px] font-medium text-slate-200 mb-1';

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/admin/dealers/${dealerId}`}
          className="text-[12px] font-medium text-sky-400 hover:text-sky-300 hover:underline mb-2 inline-block"
        >
          ← Back to {dealerName}
        </Link>
        <div className="crm-page-header">
          <h1 className="crm-page-title">Add Department</h1>
          <p className="crm-page-subtitle">
            Add a new department for {dealerName}. Set transfer phone and working hours.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-red-900/70 bg-red-950/40 px-3 py-2 text-[12px] text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="crm-section-card space-y-3">
          <div>
            <label className={labelClass}>Department Name *</label>
            <input
              className={inputClass}
              placeholder="e.g. Sales, Service, Parts"
              value={department_name}
              onChange={(e) => setDepartmentName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Transfer Phone</label>
            <input
              className={inputClass}
              placeholder="e.g. +1234567890"
              value={transfer_phone}
              onChange={(e) => setTransferPhone(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Transfer Type</label>
            <select
              className={inputClass}
              value={transfer_type}
              onChange={(e) => setTransferType(e.target.value)}
            >
              <option value="pstn">PSTN</option>
              <option value="sip">SIP</option>
              <option value="queue">Queue</option>
            </select>
          </div>
        </div>

        <div className="crm-section-card space-y-3">
          <div className="text-[14px] font-semibold text-slate-50">Working Hours</div>
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
                {hours.map((row, idx) => (
                  <tr key={row.day_of_week}>
                    <td className="text-slate-100">{row.day_of_week}</td>
                    <td>
                      <select
                        className="w-28 rounded-[6px] border border-slate-600 bg-slate-800 px-2 py-1.5 text-[12px] text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                        value={row.open_time || ''}
                        onChange={(e) => updateHour(idx, 'open_time', e.target.value)}
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
                        onChange={(e) => updateHour(idx, 'close_time', e.target.value)}
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
                        onChange={(e) => updateHour(idx, 'is_closed', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-sky-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={loading || !department_name.trim()}
            className="rounded-[8px] border border-sky-600 bg-sky-600 px-3 py-2 text-[13px] font-medium text-white hover:bg-sky-500 disabled:opacity-60 disabled:border-slate-600 disabled:bg-slate-800"
          >
            {loading ? 'Adding…' : 'Add Department'}
          </button>
          <Link
            to={`/admin/dealers/${dealerId}`}
            className="rounded-[8px] border border-slate-600 bg-slate-800 px-3 py-2 text-[13px] font-medium text-slate-100 hover:bg-slate-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

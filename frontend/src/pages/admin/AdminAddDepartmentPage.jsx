import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  apiAdminGetDealerDetail,
  apiAdminCreateDepartment,
  apiAdminReplaceDepartmentHours
} from '../../api';

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
        setError(e.message || 'Failed to load dealer');
      }
    }
    load();
  }, [dealerId]);

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
      navigate(`/admin/dealers/${dealerId}`);
    } catch (e) {
      setError(e.message || 'Failed to create department');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          to={`/admin/dealers/${dealerId}`}
          className="text-[12px] text-crm-primary hover:underline mb-2 inline-block"
        >
          ← Back to {dealerName}
        </Link>
        <h1 className="text-[18px] font-semibold text-crm-text">Add Department</h1>
        <p className="text-[13px] text-crm-text2">
          Add a new department for {dealerName}. Set transfer phone and working hours.
        </p>
      </div>

      {error && (
        <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-[8px] border border-crm-border bg-white p-4 space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-crm-text mb-1">
              Department Name *
            </label>
            <input
              className="w-full max-w-xs rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
              placeholder="e.g. Sales, Service, Parts"
              value={department_name}
              onChange={(e) => setDepartmentName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-crm-text mb-1">
              Transfer Phone
            </label>
            <input
              className="w-full max-w-xs rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
              placeholder="e.g. +1234567890"
              value={transfer_phone}
              onChange={(e) => setTransferPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-crm-text mb-1">
              Transfer Type
            </label>
            <select
              className="w-full max-w-xs rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
              value={transfer_type}
              onChange={(e) => setTransferType(e.target.value)}
            >
              <option value="pstn">PSTN</option>
              <option value="sip">SIP</option>
              <option value="queue">Queue</option>
            </select>
          </div>
        </div>

        <div className="rounded-[8px] border border-crm-border bg-white p-4 space-y-3">
          <div className="text-[14px] font-semibold text-crm-text">Working Hours</div>
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
                {hours.map((row, idx) => (
                  <tr key={row.day_of_week}>
                    <td className="px-2 py-1">{row.day_of_week}</td>
                    <td className="px-2 py-1">
                      <input
                        type="time"
                        className="w-24 rounded-[4px] border border-crm-border px-1 py-0.5"
                        value={row.open_time || ''}
                        onChange={(e) => updateHour(idx, 'open_time', e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="time"
                        className="w-24 rounded-[4px] border border-crm-border px-1 py-0.5"
                        value={row.close_time || ''}
                        onChange={(e) => updateHour(idx, 'close_time', e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        checked={!!row.is_closed}
                        onChange={(e) => updateHour(idx, 'is_closed', e.target.checked)}
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
            className="rounded-[6px] bg-crm-primary px-3 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Adding…' : 'Add Department'}
          </button>
          <Link
            to={`/admin/dealers/${dealerId}`}
            className="rounded-[6px] border border-crm-border bg-white px-3 py-2 text-[13px] text-crm-text2 hover:bg-[#F3F4F6]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

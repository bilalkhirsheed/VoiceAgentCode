import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { apiGetTransfers } from '../api';
import { useToast } from '../contexts/ToastContext';

function getTransferLabel(callRow) {
  if (callRow.transfer_success === true) return 'Success';
  if (callRow.transfer_success === false) return 'Failed';
  if (callRow.transferred) return 'Attempted';
  return '—';
}

export function TransfersPage() {
  const { selectedDealerId, search } = useOutletContext() ?? {};
  const location = useLocation();
  const toast = useToast();
  const query = location.search || '';

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDealerId) params.dealer_id = selectedDealerId;
      const data = await apiGetTransfers(params);
      setRows(data || []);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Failed to load transfer records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedDealerId]);

  const filteredRows = useMemo(() => {
    let list = [...rows];

    if (status === 'success') {
      list = list.filter((r) => r.transfer_success === true);
    } else if (status === 'failed') {
      list = list.filter((r) => r.transfer_success === false);
    } else if (status === 'attempted') {
      list = list.filter((r) => r.transferred && r.transfer_success == null);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        (r.caller_number || '').toLowerCase().includes(q) ||
        (r.transfer_target || '').toLowerCase().includes(q) ||
        (r.target_number || '').toLowerCase().includes(q) ||
        (r.dealer_name || '').toLowerCase().includes(q) ||
        (r.id || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [rows, search, status]);

  return (
    <div className="crm-page">
      <div className="flex items-center justify-between gap-4">
        <div className="crm-page-header">
          <div className="crm-page-title">Transfers</div>
          <div className="crm-page-subtitle">
            Calls transferred to staff (Success / Failed / Attempted).
          </div>
        </div>
        <button
          type="button"
          className="crm-press inline-flex h-9 items-center justify-center rounded-crm border border-slate-700 bg-slate-800 px-4 text-[13px] font-medium text-slate-100 shadow-crm-sm transition-all duration-150 hover:bg-slate-700 disabled:opacity-50"
          onClick={load}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="mt-6 crm-section-card">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className="mb-1 text-[12px] text-slate-400">Transfer Status</div>
            <select
              className="h-9 w-full rounded-[6px] border border-slate-700 bg-slate-900 px-3 text-[13px] text-slate-100"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="attempted">Attempted</option>
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[8px] border border-slate-800 bg-slate-950/40 crm-table-wrap">
          <div className="flex-1 overflow-auto">
            <table className="crm-table min-w-full text-sm table-fixed">
              <thead>
                <tr>
                  <th className="w-[150px]">When</th>
                  <th className="w-[180px]">Dealer</th>
                  <th className="w-[140px]">Caller</th>
                  <th className="w-[190px]">Transfer Target</th>
                  <th className="w-[100px]">Status</th>
                  <th className="w-[160px]">Customer</th>
                  <th className="w-[130px]">Outcome</th>
                  <th className="w-[120px]">See Call</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-500 text-sm">
                      No transfer calls found.
                    </td>
                  </tr>
                )}
                {filteredRows.map((r) => {
                  const created = r.transfer_time ? new Date(r.transfer_time) : r.start_time ? new Date(r.start_time) : null;
                  const whenLabel = created
                    ? created.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                    : '-';
                  return (
                    <tr key={`${r.call_id}-${r.id}`}>
                      <td className="whitespace-nowrap text-slate-100 overflow-hidden text-ellipsis">{whenLabel}</td>
                      <td className="whitespace-nowrap text-slate-300 overflow-hidden text-ellipsis">{r.dealer_name ?? '-'}</td>
                      <td className="whitespace-nowrap text-slate-300 overflow-hidden text-ellipsis">{r.caller_number ?? '-'}</td>
                      <td className="whitespace-nowrap text-slate-300 overflow-hidden text-ellipsis">{r.target_number ?? r.transfer_target ?? '-'}</td>
                      <td className="whitespace-nowrap text-slate-300">{getTransferLabel(r)}</td>
                      <td className="whitespace-nowrap text-slate-100 overflow-hidden text-ellipsis">{r.customer_name ?? '-'}</td>
                      <td className="whitespace-nowrap text-slate-300 overflow-hidden text-ellipsis">{r.outcome_code ?? '-'}</td>
                      <td className="whitespace-nowrap text-sky-400 text-xs overflow-hidden text-ellipsis">
                        <Link to={`/crm/calls/${encodeURIComponent(r.call_id)}${query}`} className="hover:underline">
                          View details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

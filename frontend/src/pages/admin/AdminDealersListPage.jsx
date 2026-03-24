import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiAdminListDealers, apiAdminDeleteDealer } from '../../api';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';

export function AdminDealersListPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dealers, setDealers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await apiAdminListDealers({ search: debouncedSearch, page, limit: 20 });
        setDealers(res.items || []);
        setTotal(res.total || 0);
      } catch (e) {
        const msg = e.message || 'Failed to load dealers';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [debouncedSearch, page]);

  function openDeleteConfirm(id) {
    setDeleteConfirm({ open: true, id });
  }

  async function handleConfirmDelete() {
    const id = deleteConfirm.id;
    if (!id) return;
    try {
      await apiAdminDeleteDealer(id);
      setDealers((prev) => prev.filter((d) => d.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success('Dealer deleted.');
    } catch (e) {
      toast.error(e.message || 'Failed to delete dealer');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="crm-page-header">
          <h1 className="crm-page-title">Dealers</h1>
          <p className="crm-page-subtitle">
            Search, add, edit, or delete dealerships configured for the AI agent.
          </p>
        </div>
        <Link
          to="/admin/dealers/new"
          className="crm-press inline-flex items-center justify-center rounded-[8px] border border-sky-600 bg-sky-600 px-3 py-2 text-[13px] font-medium text-white hover:bg-sky-500"
        >
          Add Dealer
        </Link>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search by name or phone…"
            className="w-full rounded-[6px] border border-slate-600 bg-slate-800 px-3 py-2 text-[13px] text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-[12px] text-slate-400">
          {loading ? 'Loading…' : `Total dealers: ${total}`}
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-red-900/70 bg-red-950/40 px-3 py-2 text-[12px] text-red-300">
          {error}
        </div>
      )}

      <div className="crm-section-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="crm-table min-w-full text-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Primary Phone</th>
                <th>Timezone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dealers.map((d) => (
                <tr key={d.id}>
                  <td className="text-slate-100">{d.dealer_name}</td>
                  <td className="text-slate-300">{d.primary_phone || '—'}</td>
                  <td className="text-slate-300">{d.timezone || '—'}</td>
                  <td className="text-slate-300 space-x-2">
                    <Link
                      to={`/admin/dealers/${d.id}`}
                      className="text-[12px] font-medium text-sky-400 hover:text-sky-300 hover:underline"
                    >
                      View / Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => openDeleteConfirm(d.id)}
                      className="text-[12px] text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && dealers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-[13px] text-slate-500 border-r-0"
                  >
                    No dealers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Dealer"
        message="Delete this dealer? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
}

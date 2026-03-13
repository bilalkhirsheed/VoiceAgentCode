import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiAdminListDealers, apiAdminDeleteDealer } from '../../api';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export function AdminDealersListPage() {
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
        setError(e.message || 'Failed to load dealers');
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
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message || 'Failed to delete dealer');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold text-crm-text">Dealers</h1>
          <p className="text-[13px] text-crm-text2">
            Search, add, edit, or delete dealerships configured for the AI agent.
          </p>
        </div>
        <Link
          to="/admin/dealers/new"
          className="rounded-[6px] bg-crm-primary px-3 py-2 text-[13px] font-medium text-white hover:bg-blue-700"
        >
          Add Dealer
        </Link>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search by name or phone…"
            className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-[12px] text-crm-text2">
          {loading ? 'Loading…' : `Total dealers: ${total}`}
        </div>
      </div>

      {error && (
        <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-[8px] border border-crm-border bg-white overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Primary Phone</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Timezone</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {dealers.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-2 text-gray-900">{d.dealer_name}</td>
                <td className="px-4 py-2 text-gray-700">{d.primary_phone || '—'}</td>
                <td className="px-4 py-2 text-gray-700">{d.timezone || '—'}</td>
                <td className="px-4 py-2 text-gray-700 space-x-2">
                  <Link
                    to={`/admin/dealers/${d.id}`}
                    className="text-[12px] text-crm-primary hover:underline"
                  >
                    View / Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => openDeleteConfirm(d.id)}
                    className="text-[12px] text-red-600 hover:underline"
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
                  className="px-4 py-6 text-center text-[13px] text-gray-400"
                >
                  No dealers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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


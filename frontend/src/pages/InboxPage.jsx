import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MoreHorizontal, Check, Mail, MailOpen } from 'lucide-react';
import { apiGetDealerDashboard } from '../api';
import {
  getDealerPhoneKey,
  getSeenCallIds,
  markAllCallsAsSeen,
  markCallAsSeen,
  unmarkCallAsSeen,
  setInboxUnreadCount
} from '../lib/inboxSeen';
import { buildInboxRows } from '../lib/inboxDashboard';
import { useToast } from '../contexts/ToastContext';

function relativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffM < 1) return 'Just now';
  if (diffM < 60) return `${diffM} min ago`;
  if (diffH < 24) return `${diffH} hr ago`;
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7) return `${diffD} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatWhen(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function InboxPage() {
  const location = useLocation();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [seenSet, setSeenSet] = useState(new Set());

  const dealerPhone = (location.search && new URLSearchParams(location.search).get('dealer_phone')) || '';
  const dealerPhoneKey = getDealerPhoneKey(location.search);

  const unreadRows = useMemo(() => rows.filter((r) => !seenSet.has(r.call_id)), [rows, seenSet]);
  const unreadCount = unreadRows.length;

  const [openMenuCallId, setOpenMenuCallId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuCallId(null);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const markAllRead = () => {
    if (!dealerPhoneKey) return;
    const ids = rows.map((r) => r.call_id).filter(Boolean);
    markAllCallsAsSeen(dealerPhoneKey, ids);
    setSeenSet(new Set(ids));
    setInboxUnreadCount(dealerPhoneKey, 0);
    setSelectedIds(new Set());
  };

  const markOneRead = (e, callId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dealerPhoneKey || !callId) return;
    markCallAsSeen(dealerPhoneKey, callId);
    setSeenSet((prev) => new Set(prev).add(callId));
    setInboxUnreadCount(dealerPhoneKey, Math.max(0, unreadCount - 1));
    setOpenMenuCallId(null);
  };

  const markOneUnread = (e, callId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dealerPhoneKey || !callId) return;
    unmarkCallAsSeen(dealerPhoneKey, callId);
    setSeenSet((prev) => {
      const next = new Set(prev);
      next.delete(callId);
      return next;
    });
    setInboxUnreadCount(dealerPhoneKey, unreadCount + 1);
    setOpenMenuCallId(null);
  };

  const toggleSelect = (e, callId) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(callId)) next.delete(callId);
      else next.add(callId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds((prev) => {
      const allIds = rows.map((r) => r.call_id).filter(Boolean);
      const isAllSelected = allIds.length > 0 && allIds.every((id) => prev.has(id));
      if (isAllSelected) {
        return new Set();
      }
      return new Set(allIds);
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const markSelectedRead = () => {
    if (!dealerPhoneKey || selectedIds.size === 0) return;
    markAllCallsAsSeen(dealerPhoneKey, Array.from(selectedIds));
    setSeenSet((prev) => {
      const next = new Set(prev);
      selectedIds.forEach((id) => next.add(id));
      return next;
    });
    const newUnread = unreadCount - rows.filter((r) => selectedIds.has(r.call_id) && !seenSet.has(r.call_id)).length;
    setInboxUnreadCount(dealerPhoneKey, Math.max(0, newUnread));
    setSelectedIds(new Set());
  };

  const markSelectedUnread = () => {
    if (!dealerPhoneKey || selectedIds.size === 0) return;
    selectedIds.forEach((id) => unmarkCallAsSeen(dealerPhoneKey, id));
    setSeenSet((prev) => {
      const next = new Set(prev);
      selectedIds.forEach((id) => next.delete(id));
      return next;
    });
    const newlyUnread = rows.filter((r) => selectedIds.has(r.call_id) && seenSet.has(r.call_id)).length;
    setInboxUnreadCount(dealerPhoneKey, unreadCount + newlyUnread);
    setSelectedIds(new Set());
  };

  useEffect(() => {
    if (!dealerPhoneKey) {
      setError('No dealer selected. Go back to the entry page and enter a dealer number.');
      setRows([]);
      setSeenSet(new Set());
      return;
    }
    setSeenSet(getSeenCallIds(dealerPhoneKey));
  }, [dealerPhoneKey, location.pathname]);

  useEffect(() => {
    if (!dealerPhone) return;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await apiGetDealerDashboard(dealerPhone);
        const inboxRows = buildInboxRows(data);
        setRows(inboxRows);

        const seen = getSeenCallIds(dealerPhoneKey);
        const count = inboxRows.filter((r) => !seen.has(r.call_id)).length;
        setInboxUnreadCount(dealerPhoneKey, count);
      } catch (e) {
        setRows([]);
        const msg = e?.message || 'Failed to load inbox.';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [dealerPhone, dealerPhoneKey, toast]);

  const search = location.search || '';

  return (
    <div className="crm-page">
      {/* Header */}
      <div className="crm-page-header mb-4">
        <h1 className="crm-page-title">Inbox</h1>
        <p className="crm-page-subtitle">
          Calls and activity for your dealership. Open a call to mark it as read.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[10px] border border-red-900/70 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Summary card — always visible */}
      <section className="mb-6 crm-section-card overflow-hidden">
        <div className="border-b border-slate-800/70 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    unreadCount > 0 ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {unreadCount}
                </div>
                <div>
                  <h2 className="font-medium text-slate-50">
                    {unreadCount === 0
                      ? 'All caught up'
                      : unreadCount === 1
                        ? '1 unread call'
                        : `${unreadCount} unread calls`}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {unreadCount > 0
                      ? 'Open a call, or use ⋮ on each row to mark read/unread. Select multiple for bulk actions.'
                      : 'No new activity since you last checked.'}
                  </p>
                </div>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="crm-press inline-flex items-center justify-center rounded-[8px] border border-sky-600 bg-sky-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-sky-500"
                >
                  Mark all as read
                </button>
              )}
            </div>
        </div>

        {!loading && unreadCount > 0 && unreadRows.length > 0 && (
          <div className="border-t border-slate-800/70 px-5 py-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Latest unread</p>
              <ul className="space-y-1">
                {unreadRows.slice(0, 5).map((row) => (
                  <li key={row.call_id}>
                    <Link
                      to={`/crm/calls/${encodeURIComponent(row.call_id)}${search}`}
                      className="flex items-center justify-between gap-3 rounded-lg py-2 px-2 -mx-2 hover:bg-slate-900/70"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-slate-100">
                          {row.customer_name || row.customer_phone || 'Call'}
                        </span>
                        <span className="ml-2 text-slate-400">· {(row.category || 'other').toLowerCase()}</span>
                        {row.service_request && (
                          <p className="mt-0.5 truncate text-sm text-slate-400">{row.service_request}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-slate-500">{relativeTime(row.created_at)}</span>
                      <span className="shrink-0 text-sm font-medium text-sky-400">View →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            {unreadRows.length > 5 && (
              <p className="mt-2 text-xs text-slate-500">+ {unreadRows.length - 5} more in the list below</p>
            )}
          </div>
        )}
      </section>

      {/* Full list — per-row read/unread + optional multi-select */}
      <section className="crm-section-card overflow-hidden">
        <div className="border-b border-slate-800/70 px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-100">All activity</h2>
            {rows.length > 0 && (
              <button
                type="button"
                onClick={selectAll}
                className="text-xs font-medium text-slate-300 hover:text-slate-100"
              >
                Select all
              </button>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/70 px-5 py-2">
              <span className="text-sm text-slate-200">{selectedIds.size} selected</span>
              <button
                type="button"
                onClick={markSelectedRead}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
              >
                <MailOpen className="h-3.5 w-3.5" />
                Mark as read
              </button>
              <button
                type="button"
                onClick={markSelectedUnread}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
              >
                <Mail className="h-3.5 w-3.5" />
                Mark as unread
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs font-medium text-slate-300 hover:text-slate-100"
              >
                Clear
              </button>
            </div>
          )}

          <div className="divide-y divide-slate-600/60">
            {loading && rows.length === 0 && (
              <div className="px-5 py-12 text-center text-sm text-slate-400">Loading…</div>
            )}
            {!loading && rows.length === 0 && (
              <div className="px-5 py-12 text-center text-sm text-slate-400">No calls yet.</div>
            )}
            {rows.map((row) => {
              const isUnread = !seenSet.has(row.call_id);
              const categoryLabel = (row.category || 'other').toLowerCase();
              const isMenuOpen = openMenuCallId === row.call_id;
              const isSelected = selectedIds.has(row.call_id);

              return (
                <div
                  key={row.call_id}
                  className={`group flex items-start gap-3 px-5 py-3 transition-colors ${
                    isUnread ? 'bg-transparent' : 'bg-transparent'
                  } ${isSelected ? 'ring-1 ring-sky-500/60' : ''} hover:bg-slate-900/20`}
                >
                  <button
                    type="button"
                    onClick={(e) => toggleSelect(e, row.call_id)}
                    className={`mt-3.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 focus:ring-offset-slate-900 ${
                      isSelected ? 'border-sky-500 bg-sky-500/30' : 'border-slate-500 bg-transparent'
                    }`}
                    aria-pressed={isSelected}
                    aria-label={isSelected ? 'Deselect' : 'Select'}
                  >
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                    ) : null}
                  </button>
                  <Link
                    to={`/crm/calls/${encodeURIComponent(row.call_id)}${search}`}
                    className="min-w-0 flex-1 flex items-start gap-3 py-1"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-transparent border border-slate-600">
                      {isSelected ? (
                        <Check className="h-4 w-4 text-slate-200" strokeWidth={2.5} />
                      ) : isUnread ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-sky-500" title="Unread" />
                      ) : (
                        <Check className="h-4 w-4 text-slate-200" strokeWidth={2.5} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={isUnread ? 'font-semibold text-slate-100' : 'font-medium text-slate-200'}>
                          {row.customer_name || row.customer_phone || 'Unknown caller'}
                        </span>
                        <span className="rounded border border-slate-700 bg-transparent px-1.5 py-0.5 text-xs text-slate-300 capitalize">
                          {categoryLabel}
                        </span>
                        {isUnread && (
                          <span className="rounded border border-sky-500/30 bg-transparent px-1.5 py-0.5 text-xs font-medium text-sky-400">
                            New
                          </span>
                        )}
                      </div>
                      {row.service_request && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-slate-400">{row.service_request}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm text-slate-400">{formatWhen(row.created_at)}</div>
                      <div className="mt-0.5 text-xs font-medium text-sky-400">View call</div>
                    </div>
                  </Link>
                  <div className="relative shrink-0 pt-1" ref={isMenuOpen ? menuRef : null}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenMenuCallId(isMenuOpen ? null : row.call_id);
                      }}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                      title="More actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {isMenuOpen && (
                      <div className="absolute right-0 top-full z-10 mt-0.5 w-44 rounded-lg border border-slate-800 bg-slate-950 py-1 shadow-lg">
                        {isUnread ? (
                          <button
                            type="button"
                            onClick={(e) => markOneRead(e, row.call_id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-900"
                          >
                            <MailOpen className="h-4 w-4 shrink-0" />
                            Mark as read
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => markOneUnread(e, row.call_id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-900"
                          >
                            <Mail className="h-4 w-4 shrink-0" />
                            Mark as unread
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
      </section>
    </div>
  );
}

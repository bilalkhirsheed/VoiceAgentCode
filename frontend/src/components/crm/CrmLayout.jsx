import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { apiGetDealers, apiGetDealerDashboard } from '../../api';
import { getDealerPhoneKey, getSeenCallIds, setInboxUnreadCount } from '../../lib/inboxSeen';
import { buildInboxRows } from '../../lib/inboxDashboard';
import { getDealerSession } from '../../lib/dealerSession';

export function CrmLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [dealers, setDealers] = useState([]);
  const [selectedDealerId, setSelectedDealerId] = useState(null);
  const [search, setSearch] = useState('');

  const dealerPhoneFromUrl = new URLSearchParams(location.search || '').get('dealer_phone');
  useEffect(() => {
    if (!dealerPhoneFromUrl) {
      const session = getDealerSession();
      if (session && session.dealer_phone) {
        navigate(`/crm?dealer_phone=${encodeURIComponent(session.dealer_phone)}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [dealerPhoneFromUrl, navigate]);

  useEffect(() => {
    apiGetDealers()
      .then((data) => setDealers(data ?? []))
      .catch(console.error);
  }, []);

  // Prime Inbox unread count when dealer lands on CRM so sidebar shows (N) without opening Inbox
  useEffect(() => {
    const dealerPhone = new URLSearchParams(location.search || '').get('dealer_phone');
    const dealerPhoneKey = getDealerPhoneKey(location.search);
    if (!dealerPhone || !dealerPhoneKey) return;
    apiGetDealerDashboard(dealerPhone)
      .then((data) => {
        const rows = buildInboxRows(data);
        const seen = getSeenCallIds(dealerPhoneKey);
        const count = rows.filter((r) => !seen.has(r.call_id)).length;
        setInboxUnreadCount(dealerPhoneKey, count);
      })
      .catch(() => {});
  }, [location.search]);

  useEffect(() => {
    const saved = localStorage.getItem('crm.selectedDealerId');
    if (saved) setSelectedDealerId(saved);
  }, []);

  useEffect(() => {
    if (selectedDealerId !== null) localStorage.setItem('crm.selectedDealerId', selectedDealerId ?? '');
  }, [selectedDealerId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 crm-shell">
      <Sidebar />
      <div className="pl-[248px]">
        <TopBar search={search} onSearchChange={setSearch} />
        <main className="crm-main">
          <Outlet context={{ selectedDealerId, search, dealers }} />
        </main>
      </div>
    </div>
  );
}

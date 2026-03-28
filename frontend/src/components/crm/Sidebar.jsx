import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Inbox,
  PhoneCall,
  Wrench,
  BadgeDollarSign,
  Package,
  PhoneIncoming,
  ArrowLeftRight,
  Building2,
  BarChart3,
  Calendar,
  FileText,
  PhoneOff,
  LogOut
} from 'lucide-react';

import { getDealerPhoneKey, getInboxUnreadCount as getInboxUnreadFromStore } from '../../lib/inboxSeen';
import { setDealerSession } from '../../lib/dealerSession';

function getInboxUnreadCount(search) {
  const key = getDealerPhoneKey(search);
  return key ? getInboxUnreadFromStore(key) : 0;
}

const navItems = [
  { to: '/crm', label: 'Home', icon: Home },
  { to: '/crm/inbox', label: 'Inbox', icon: Inbox, showUnread: true },
  { to: '/crm/calls', label: 'Calls', icon: PhoneCall },
  { to: '/crm/service-appointments', label: 'Service Appointments', icon: Wrench },
  { to: '/crm/sales-leads', label: 'Sales Leads', icon: BadgeDollarSign },
  { to: '/crm/parts-requests', label: 'Parts Requests', icon: Package },
  { to: '/crm/callback-requests', label: 'Callback Requests', icon: PhoneIncoming },
  { to: '/crm/hangups', label: 'User Hangups', icon: PhoneOff },
  { to: '/crm/transfers', label: 'Transfers', icon: ArrowLeftRight },
  { to: '/crm/dealership', label: 'Dealership Info', icon: Building2 },
  { to: '/crm/ai-metrics', label: 'AI Metrics', icon: BarChart3 },
  // Calendar is still available by URL but hidden from primary nav
  { to: '/crm/reports', label: 'Reports', icon: FileText }
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const search = location.search || '';
  const [tick, setTick] = useState(0);

  function handleLogout() {
    setDealerSession(null);
    navigate('/');
  }

  useEffect(() => {
    const onUpdate = () => setTick((t) => t + 1);
    window.addEventListener('crm-inbox-unread-changed', onUpdate);
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener('crm-inbox-unread-changed', onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, []);
  const unread = getInboxUnreadCount(search);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col border-r border-slate-800 bg-slate-900 shadow-crm-sm">
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="text-[14px] font-semibold tracking-tight text-slate-50">AI Voice Agent CRM</div>
        <div className="mt-1 text-[12px] text-slate-400">Dealership operations</div>
      </div>
      <nav className="flex-1 overflow-auto px-2 py-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={`${to}${search}`}
            end={to === '/crm'}
            className={({ isActive }) =>
              `mb-0.5 flex h-10 items-center gap-2.5 rounded-crm px-3 text-[13px] transition-all duration-150 ease-smooth border-l-2 ${
                isActive
                  ? 'bg-slate-800 text-white border-l-sky-400 font-medium'
                  : 'border-l-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`
            }
          >
            <Icon size={17} className="shrink-0 opacity-90" />
            <span className="truncate">
              {label}
              {label === 'Inbox' ? ` (${unread})` : ''}
            </span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-slate-800 px-2 py-3">
        <button
          type="button"
          onClick={handleLogout}
          className="crm-press flex h-10 w-full items-center gap-2.5 rounded-crm px-3 text-[13px] text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <LogOut size={17} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}

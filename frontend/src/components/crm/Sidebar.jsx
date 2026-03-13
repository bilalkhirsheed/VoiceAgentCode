import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  PhoneCall,
  Wrench,
  BadgeDollarSign,
  Package,
  PhoneIncoming,
  ArrowLeftRight,
  Building2,
  Calendar,
  FileText,
  Settings,
  PhoneOff
} from 'lucide-react';

const navItems = [
  { to: '/crm', label: 'Home', icon: Home },
  { to: '/crm/calls', label: 'Calls', icon: PhoneCall },
  { to: '/crm/service-appointments', label: 'Service Appointments', icon: Wrench },
  { to: '/crm/sales-leads', label: 'Sales Leads', icon: BadgeDollarSign },
  { to: '/crm/parts-requests', label: 'Parts Requests', icon: Package },
  { to: '/crm/callback-requests', label: 'Callback Requests', icon: PhoneIncoming },
  { to: '/crm/hangups', label: 'User Hangups', icon: PhoneOff },
  { to: '/crm/transfers', label: 'Transfers', icon: ArrowLeftRight },
  { to: '/crm/dealership', label: 'Dealership Info', icon: Building2 },
  // Calendar is still available by URL but hidden from primary nav
  { to: '/crm/reports', label: 'Reports', icon: FileText },
  { to: '/crm/settings', label: 'Settings', icon: Settings }
];

export function Sidebar() {
  const location = useLocation();
  const search = location.search || '';

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-[248px] border-r border-crm-border bg-white">
      <div className="px-4 py-4">
        <div className="text-[13px] font-semibold text-crm-text">AI Voice Agent CRM</div>
        <div className="mt-1 text-[12px] text-crm-text2">Dealership operations</div>
      </div>
      <nav className="px-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={`${to}${search}`}
            end={to === '/crm'}
            className={({ isActive }) =>
              `mb-1 flex h-10 items-center gap-2 rounded-[6px] px-3 text-[13px] text-crm-text2 hover:bg-[#F3F4F6] ${
                isActive ? 'bg-[#EFF6FF] text-crm-primary' : ''
              }`
            }
          >
            <Icon size={16} className="shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

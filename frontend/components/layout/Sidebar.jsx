const React = require('react');
const Link = require('next/link');
const { cn } = require('../../lib/cn');
const {
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
  Settings
} = require('lucide-react');

const items = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/calls', label: 'Calls', icon: PhoneCall },
  { href: '/service-appointments', label: 'Service Appointments', icon: Wrench },
  { href: '/sales-leads', label: 'Sales Leads', icon: BadgeDollarSign },
  { href: '/parts-requests', label: 'Parts Requests', icon: Package },
  { href: '/callback-requests', label: 'Callback Requests', icon: PhoneIncoming },
  { href: '/transfers', label: 'Transfers', icon: ArrowLeftRight },
  { href: '/dealership', label: 'Dealership Info', icon: Building2 },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings }
];

function Sidebar({ pathname }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-[248px] border-r border-crm-border bg-white">
      <div className="px-4 py-4">
        <div className="text-[13px] font-semibold text-crm-text">
          AI Voice Agent CRM
        </div>
        <div className="mt-1 text-[12px] text-crm-text2">Dealership operations</div>
      </div>
      <nav className="px-2">
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                'mb-1 flex h-10 items-center gap-2 rounded-crm px-3 text-[13px] text-crm-text2 hover:bg-[#F3F4F6]',
                active && 'bg-[#EFF6FF] text-crm-primary'
              )}
            >
              <Icon size={16} className={cn(active ? 'text-crm-primary' : 'text-crm-muted')} />
              <span className="truncate">{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

module.exports = { Sidebar };


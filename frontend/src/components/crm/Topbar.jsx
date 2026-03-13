import { Search } from 'lucide-react';

export function Topbar({ dealers = [], selectedDealerId, onDealerChange, search, onSearchChange }) {
  return (
    <header className="sticky top-0 z-20 border-b border-crm-border bg-white">
      <div className="flex h-14 items-center justify-between gap-3 px-6">
        <div className="flex max-w-[760px] flex-1 items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-crm-muted"
            />
            <input
              type="text"
              className="h-9 w-full rounded-[6px] border border-crm-border bg-white pl-9 pr-3 text-[13px] text-crm-text placeholder:text-crm-muted focus:outline-none focus:ring-2 focus:ring-crm-primary/30"
              placeholder="Search calls or customers..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <div className="w-[260px]">
            <select
              className="h-9 w-full rounded-[6px] border border-crm-border bg-white px-3 text-[13px] text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary/30"
              value={selectedDealerId ?? ''}
              onChange={(e) => onDealerChange(e.target.value || null)}
            >
              <option value="">All dealerships</option>
              {dealers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.dealer_name} ({d.primary_phone || 'no DID'})
                </option>
              ))}
            </select>
          </div>
          <div className="w-[140px]">
            <select className="h-9 w-full rounded-[6px] border border-crm-border bg-white px-3 text-[13px] text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary/30">
              <option value="production">Production</option>
              <option value="staging">Staging</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-crm-text2">Admin</div>
      </div>
    </header>
  );
}

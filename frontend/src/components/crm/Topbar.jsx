import { Search } from 'lucide-react';

export function TopBar({ search, onSearchChange }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm shadow-crm-sm">
      <div className="flex h-14 items-center justify-between gap-3 px-6">
        <div className="flex max-w-[760px] flex-1 items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              className="h-9 w-full rounded-crm border border-slate-700 bg-slate-800/80 pl-9 pr-3 text-[13px] text-slate-100 placeholder:text-slate-500 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 focus:bg-slate-900"
              placeholder="Search calls or customers..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-crm bg-slate-800 px-3 py-1.5 text-[12px] font-medium text-slate-200 border border-slate-700">
          Dealer
        </div>
      </div>
    </header>
  );
}

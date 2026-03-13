const React = require('react');
const { Bell, ChevronDown, Search } = require('lucide-react');
const { Input } = require('../ui/input');
const { Select } = require('../ui/select');
const { Button } = require('../ui/button');

function Topbar({
  dealers,
  selectedDealerId,
  onSelectDealerId,
  env,
  onChangeEnv,
  search,
  onChangeSearch
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-crm-border bg-white">
      <div className="flex h-14 items-center justify-between gap-3 px-6">
        <div className="flex w-full max-w-[760px] items-center gap-3">
          <div className="relative w-full">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-crm-muted"
            />
            <Input
              className="pl-9"
              placeholder="Search calls or customers..."
              value={search}
              onChange={(e) => onChangeSearch(e.target.value)}
            />
          </div>

          <div className="w-[260px]">
            <Select
              value={selectedDealerId || ''}
              onChange={(e) => onSelectDealerId(e.target.value || null)}
            >
              <option value="">All dealerships</option>
              {dealers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.dealer_name} ({d.primary_phone || 'no DID'})
                </option>
              ))}
            </Select>
          </div>

          <div className="w-[160px]">
            <Select value={env} onChange={(e) => onChangeEnv(e.target.value)}>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" aria-label="Notifications">
            <Bell size={16} className="text-crm-text2" />
          </Button>
          <Button variant="secondary">
            <span className="text-[13px]">Admin</span>
            <ChevronDown size={16} className="text-crm-text2" />
          </Button>
        </div>
      </div>
    </header>
  );
}

module.exports = { Topbar };


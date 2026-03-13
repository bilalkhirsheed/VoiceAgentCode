'use client';

const React = require('react');
const { usePathname } = require('next/navigation');
const { Sidebar } = require('../../components/layout/Sidebar');
const { Topbar } = require('../../components/layout/Topbar');
const { getDealers } = require('../../lib/api');

module.exports = function CrmLayout({ children }) {
  const pathname = usePathname();
  const [dealers, setDealers] = React.useState([]);
  const [selectedDealerId, setSelectedDealerId] = React.useState(null);
  const [env, setEnv] = React.useState('production');
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    const storedDealer = window.localStorage.getItem('crm.selectedDealerId');
    const storedEnv = window.localStorage.getItem('crm.env');
    if (storedDealer) setSelectedDealerId(storedDealer);
    if (storedEnv) setEnv(storedEnv);
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem('crm.selectedDealerId', selectedDealerId || '');
  }, [selectedDealerId]);

  React.useEffect(() => {
    window.localStorage.setItem('crm.env', env);
  }, [env]);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await getDealers();
        setDealers(data || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-crm-page">
      <Sidebar pathname={pathname} />
      <div className="pl-[248px]">
        <Topbar
          dealers={dealers}
          selectedDealerId={selectedDealerId}
          onSelectDealerId={setSelectedDealerId}
          env={env}
          onChangeEnv={setEnv}
          search={search}
          onChangeSearch={setSearch}
        />
        <main>{React.cloneElement(children, { selectedDealerId, search })}</main>
      </div>
    </div>
  );
};


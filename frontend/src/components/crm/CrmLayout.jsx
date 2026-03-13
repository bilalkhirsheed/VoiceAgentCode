import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { apiGetDealers } from '../../api';

export function CrmLayout() {
  const [dealers, setDealers] = useState([]);
  const [selectedDealerId, setSelectedDealerId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiGetDealers()
      .then((data) => setDealers(data ?? []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('crm.selectedDealerId');
    if (saved) setSelectedDealerId(saved);
  }, []);

  useEffect(() => {
    if (selectedDealerId !== null) localStorage.setItem('crm.selectedDealerId', selectedDealerId ?? '');
  }, [selectedDealerId]);

  return (
    <div className="min-h-screen bg-crm-page">
      <Sidebar />
      <div className="pl-[248px]">
        <Topbar
          dealers={dealers}
          selectedDealerId={selectedDealerId}
          onDealerChange={setSelectedDealerId}
          search={search}
          onSearchChange={setSearch}
        />
        <main>
          <Outlet context={{ selectedDealerId, search, dealers }} />
        </main>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { DealerPanel } from './components/DealerPanel.jsx';
import { CallsPanel } from './components/CallsPanel.jsx';

const TABS = [
  { id: 'dealers', label: 'Dealers & Config' },
  { id: 'calls', label: 'Call Logs' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dealers');

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title">
          <h1>AI Call Platform · Admin</h1>
          <span>Onboard dealers, tune routing, and inspect AI call performance.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="pill">Staging / Localhost</div>
          <nav className="tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={'tab' + (activeTab === tab.id ? ' active' : '')}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {activeTab === 'dealers' && <DealerPanel />}
      {activeTab === 'calls' && <CallsPanel />}
    </div>
  );
}


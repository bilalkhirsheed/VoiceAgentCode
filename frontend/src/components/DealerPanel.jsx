import React, { useEffect, useMemo, useState } from 'react';
import {
  apiCreateDealer,
  apiGetDealerConfigByPhone,
  apiGetDealerDepartments,
  apiGetDealers
} from '../api.js';

const emptyDealer = {
  dealer_name: '',
  timezone: 'Asia/Karachi',
  address: '',
  city: '',
  state: '',
  country: '',
  zip_code: '',
  primary_phone: '',
  default_voice: 'female'
};

export function DealerPanel() {
  const [dealers, setDealers] = useState([]);
  const [selectedDealerId, setSelectedDealerId] = useState(null);
  const [dealerForm, setDealerForm] = useState(emptyDealer);
  const [isSavingDealer, setIsSavingDealer] = useState(false);
  const [loadingDealers, setLoadingDealers] = useState(false);

  const [configJson, setConfigJson] = useState('');
  const [configLoading, setConfigLoading] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingDealers(true);
      try {
        const data = await apiGetDealers();
        setDealers(data || []);
        if (data && data.length > 0 && !selectedDealerId) {
          setSelectedDealerId(data[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingDealers(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedDealerId) return;
    (async () => {
      setDepartmentsLoading(true);
      try {
        const data = await apiGetDealerDepartments(selectedDealerId);
        setDepartments(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setDepartmentsLoading(false);
      }
    })();
  }, [selectedDealerId]);

  const selectedDealer = useMemo(
    () => dealers.find((d) => d.id === selectedDealerId) || null,
    [dealers, selectedDealerId]
  );

  const handleDealerChange = (field, value) => {
    setDealerForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateDealer = async (e) => {
    e.preventDefault();
    setIsSavingDealer(true);
    try {
      const created = await apiCreateDealer(dealerForm);
      setDealers((prev) => [created, ...prev]);
      setDealerForm(emptyDealer);
      setSelectedDealerId(created.id);
    } catch (err) {
      console.error(err);
      alert('Failed to create dealer: ' + err.message);
    } finally {
      setIsSavingDealer(false);
    }
  };

  const handleFetchConfigByPhone = async () => {
    if (!dealerForm.primary_phone && !selectedDealer?.primary_phone) {
      alert('Provide a phone number in the form or select a dealer with primary_phone set.');
      return;
    }
    const did = dealerForm.primary_phone || selectedDealer.primary_phone;
    setConfigLoading(true);
    try {
      const cfg = await apiGetDealerConfigByPhone(did);
      setConfigJson(JSON.stringify(cfg, null, 2));
    } catch (e) {
      console.error(e);
      setConfigJson(`Error: ${e.message}`);
    } finally {
      setConfigLoading(false);
    }
  };

  return (
    <div className="layout-grid">
      <div className="card">
        <div className="card-header">
          <div>
            <h2>Dealerships</h2>
            <span>Manage stores and core routing profile</span>
          </div>
          {loadingDealers && <span className="badge">Loading…</span>}
        </div>
        <div className="list">
          {dealers.map((d) => (
            <button
              key={d.id}
              type="button"
              className={
                'list-item' + (d.id === selectedDealerId ? ' active' : '')
              }
              onClick={() => setSelectedDealerId(d.id)}
            >
              <div className="list-item-main">
                <div className="list-item-title">{d.dealer_name}</div>
                <div className="list-item-sub">
                  {d.city || '-'} {d.state ? `• ${d.state}` : ''}{' '}
                  {d.country ? `• ${d.country}` : ''}
                </div>
              </div>
              <div className="badge">
                {d.primary_phone || 'no DID'}{' '}
                {d.default_voice ? `• ${d.default_voice}` : ''}
              </div>
            </button>
          ))}
          {!dealers.length && !loadingDealers && (
            <div className="list-item">
              <div className="list-item-main">
                <div className="list-item-title">No dealers yet</div>
                <div className="list-item-sub">
                  Use the form on the right to create the first store.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header split">
          <div>
            <h2>Dealer profile & Retell config</h2>
            <span>Create or inspect a dealership config</span>
          </div>
          <button
            type="button"
            className="btn secondary"
            onClick={handleFetchConfigByPhone}
            disabled={configLoading}
          >
            {configLoading ? 'Loading config…' : 'Preview config by DID'}
          </button>
        </div>

        <form onSubmit={handleCreateDealer}>
          <div className="form-grid">
            <div className="field">
              <label>Dealer name</label>
              <input
                value={dealerForm.dealer_name}
                onChange={(e) => handleDealerChange('dealer_name', e.target.value)}
                placeholder="Pakistan Demo Dealer"
                required
              />
            </div>
            <div className="field">
              <label>Timezone</label>
              <input
                value={dealerForm.timezone}
                onChange={(e) => handleDealerChange('timezone', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Primary phone (DID)</label>
              <input
                value={dealerForm.primary_phone}
                onChange={(e) =>
                  handleDealerChange('primary_phone', e.target.value)
                }
                placeholder="+923137633702"
                required
              />
            </div>
            <div className="field">
              <label>Default voice</label>
              <select
                value={dealerForm.default_voice}
                onChange={(e) =>
                  handleDealerChange('default_voice', e.target.value)
                }
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <div className="field">
              <label>City</label>
              <input
                value={dealerForm.city}
                onChange={(e) => handleDealerChange('city', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Country</label>
              <input
                value={dealerForm.country}
                onChange={(e) => handleDealerChange('country', e.target.value)}
              />
            </div>
          </div>
          <button className="btn" type="submit" disabled={isSavingDealer}>
            {isSavingDealer ? 'Saving…' : 'Create dealer'}
          </button>
        </form>

        <div style={{ marginTop: '0.9rem' }} className="two-column">
          <div>
            <div className="split" style={{ marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                Departments ({departments.length})
              </span>
              {departmentsLoading && <span className="badge">Loading…</span>}
            </div>
            <div className="list" style={{ maxHeight: 170 }}>
              {departments.map((dept) => (
                <div key={dept.id} className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-title">
                      {dept.department_name}
                    </div>
                    <div className="list-item-sub">
                      {dept.transfer_phone || 'no transfer number'} •{' '}
                      {dept.transfer_type || 'n/a'}
                    </div>
                  </div>
                  <span className="badge">
                    after-hours:{' '}
                    {dept.after_hours_action ? dept.after_hours_action : 'n/a'}
                  </span>
                </div>
              ))}
              {!departments.length && !departmentsLoading && (
                <div className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-title">No departments yet</div>
                    <div className="list-item-sub">
                      Use the Departments tab to add Sales / Service / Parts.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
              Dealer config preview (for Retell)
            </span>
            <div className="code-block" style={{ marginTop: '0.4rem' }}>
              <pre style={{ margin: 0 }}>
                {configJson || '// Click "Preview config by DID" to load.'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


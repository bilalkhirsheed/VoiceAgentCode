import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiGetDealerDashboard } from '../api';

function Card({ title, description, to }) {
  return (
    <Link
      to={to}
      className="block rounded-[6px] border border-crm-border bg-white p-5 hover:bg-[#F9FAFB]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[16px] font-semibold text-crm-text">{title}</div>
          <div className="mt-1 text-[13px] text-crm-text2">{description}</div>
        </div>
        <ArrowRight size={16} className="mt-1 text-crm-muted" />
      </div>
    </Link>
  );
}

export function HomePage() {
  const location = useLocation();
  const search = location.search || '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dealerPhone = params.get('dealer_phone');
    if (!dealerPhone) {
      setError('No dealer DID provided. Go back to the entry page and enter a dealer number.');
      setDashboard(null);
      return;
    }

    async function loadDashboard() {
      setError('');
      setLoading(true);
      try {
        const data = await apiGetDealerDashboard(dealerPhone.trim());
        setDashboard(data);
      } catch (e) {
        setDashboard(null);
        if (e.message && e.message.includes('Dealer not found')) {
          setError("This dealer doesn't exist for that phone number.");
        } else {
          setError(e.message || 'Failed to load dealer.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [location.search]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="text-[24px] font-semibold text-crm-text">Home</div>
        <div className="mt-2 text-[14px] text-crm-text2">
          Operational CRM for AI-captured calls, callbacks, transfers, service bookings and leads.
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-[6px] px-3 py-2">
          {error}
        </div>
      )}

      {loading && !dashboard && (
        <div className="text-sm text-crm-text2">Loading dealer dashboard…</div>
      )}

      {dashboard && !error && (
        <div className="space-y-6">
          <div className="rounded-[6px] border border-crm-border bg-white p-4 flex flex-col gap-1">
            <div className="text-sm font-semibold text-crm-text">Dealer</div>
            <div className="text-[13px] text-crm-text2">
              {dashboard.dealer_name} · {dashboard.dealer_phone}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-[6px] border border-crm-border bg-white p-3">
              <div className="text-[11px] uppercase text-crm-text2">Sales</div>
              <div className="text-[18px] font-semibold text-crm-text">
                {dashboard.sales?.count ?? 0}
              </div>
            </div>
            <div className="rounded-[6px] border border-crm-border bg-white p-3">
              <div className="text-[11px] uppercase text-crm-text2">Service</div>
              <div className="text-[18px] font-semibold text-crm-text">
                {dashboard.service?.count ?? 0}
              </div>
            </div>
            <div className="rounded-[6px] border border-crm-border bg-white p-3">
              <div className="text-[11px] uppercase text-crm-text2">Parts</div>
              <div className="text-[18px] font-semibold text-crm-text">
                {dashboard.parts?.count ?? 0}
              </div>
            </div>
            <div className="rounded-[6px] border border-crm-border bg-white p-3">
              <div className="text-[11px] uppercase text-crm-text2">Callbacks</div>
              <div className="text-[18px] font-semibold text-crm-text">
                {dashboard.callbacks?.count ?? 0}
              </div>
            </div>
            <div className="rounded-[6px] border border-crm-border bg-white p-3">
              <div className="text-[11px] uppercase text-crm-text2">User Hangups</div>
              <div className="text-[18px] font-semibold text-crm-text">
                {dashboard.user_hangups?.count ?? 0}
              </div>
            </div>
            <div className="rounded-[6px] border border-crm-border bg-white p-3">
              <div className="text-[11px] uppercase text-crm-text2">Service Requests</div>
              <div className="text-[18px] font-semibold text-crm-text">
                {dashboard.service_appointments?.count ?? 0}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              title="Calls"
              description="View call logs, filter by intent/date, and open transcripts & recordings."
              to={`/crm/calls${search}`}
            />
            <Card
              title="Callback Requests"
              description="Manage after-hours callback capture workflow."
              to={`/crm/callback-requests${search}`}
            />
            <Card
              title="Service Appointments"
              description="Confirm and schedule service booking requests captured by AI."
              to={`/crm/service-appointments${search}`}
            />
            <Card
              title="Sales Leads"
              description="View and assign sales leads captured from AI calls."
              to={`/crm/sales-leads${search}`}
            />
          </div>
        </div>
      )}

      {!dashboard && !error && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card
            title="Calls"
            description="View call logs, filter by intent/date, and open transcripts & recordings."
            to={`/crm/calls${search}`}
          />
          <Card
            title="Callback Requests"
            description="Manage after-hours callback capture workflow."
            to={`/crm/callback-requests${search}`}
          />
          <Card
            title="Service Appointments"
            description="Confirm and schedule service booking requests captured by AI."
            to={`/crm/service-appointments${search}`}
          />
          <Card
            title="Sales Leads"
            description="View and assign sales leads captured from AI calls."
            to={`/crm/sales-leads${search}`}
          />
        </div>
      )}
    </div>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiGetDealerDashboard } from '../api';
import { useToast } from '../contexts/ToastContext';

function Card({ title, description, to }) {
  return (
    <Link
      to={to}
      className="group crm-press block crm-section-card--soft transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-sky-500/40 hover:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[15px] font-semibold text-slate-50">{title}</div>
          <div className="mt-1 text-[13px] leading-snug text-slate-400">{description}</div>
        </div>
        <ArrowRight
          size={18}
          className="mt-1 text-slate-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-sky-400"
        />
      </div>
    </Link>
  );
}

export function HomePage() {
  const location = useLocation();
  const toast = useToast();
  const search = location.search || '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dealerPhone = params.get('dealer_phone');
    if (!dealerPhone) {
      const msg = 'No dealer DID provided. Go back to the entry page and enter a dealer number.';
      setError(msg);
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
        const msg =
          e.message && e.message.includes('Dealer not found')
            ? "This dealer doesn't exist for that phone number."
            : e.message || 'Failed to load dealer.';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [location.search, toast]);

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div className="crm-page-title">Home</div>
        <div className="crm-page-subtitle">
          Operational CRM for AI-captured calls, callbacks, transfers, service bookings and leads.
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/70 rounded-[10px] px-3 py-2">
          {error}
        </div>
      )}

      {loading && !dashboard && (
        <div className="text-sm text-slate-400">Loading dealer dashboard…</div>
      )}

      {dashboard && !error && (
        <div className="space-y-6">
          <div className="crm-section-card flex flex-col gap-1">
            <div className="text-sm font-semibold text-slate-50">Dealer</div>
            <div className="text-[13px] text-slate-400">
              {dashboard.dealer_name} · {dashboard.dealer_phone}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { key: 'sales', label: 'Sales', count: dashboard.sales?.count ?? 0 },
              { key: 'service', label: 'Service', count: dashboard.service?.count ?? 0 },
              { key: 'parts', label: 'Parts', count: dashboard.parts?.count ?? 0 },
              { key: 'callbacks', label: 'Callbacks', count: dashboard.callbacks?.count ?? 0 },
              { key: 'hangups', label: 'User Hangups', count: dashboard.user_hangups?.count ?? 0 },
              { key: 'appts', label: 'Service Requests', count: dashboard.service_appointments?.count ?? 0 }
            ].map(({ key, label, count }) => (
              <div
                key={key}
                className="crm-section-card--soft transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
                <div className="mt-1 text-[20px] font-semibold tabular-nums text-slate-50">{count}</div>
              </div>
            ))}
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

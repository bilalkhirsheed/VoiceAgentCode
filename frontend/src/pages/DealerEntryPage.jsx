import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Lock, Headphones, Activity, Clock } from 'lucide-react';
import { apiDealerLogin } from '../api';
import { setDealerSession } from '../lib/dealerSession';
import { useToast } from '../contexts/ToastContext';

export function DealerEntryPage() {
  const toast = useToast();
  const [dealerPhone, setDealerPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const phone = dealerPhone.trim();
    if (!phone) {
      const msg = 'Please enter dealer phone (primary DID).';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!password) {
      const msg = 'Please enter your password.';
      setError(msg);
      toast.error(msg);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await apiDealerLogin(phone, password);
      setDealerSession({
        dealer_id: res.dealer_id,
        dealer_phone: res.dealer_phone,
        dealer_name: res.dealer_name
      });
      toast.success('Signed in.');
      navigate(`/crm?dealer_phone=${encodeURIComponent(res.dealer_phone)}`);
    } catch (err) {
      const msg = err.message || 'Login failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-orbit login-orbit--dealer" aria-hidden />
      <div className="login-grid" aria-hidden />

      <section className="login-hero login-hero--dealer">
        <div className="login-hero-header">
          <div className="login-hero-logo">
            <Headphones size={22} strokeWidth={2} />
          </div>
          <span className="login-hero-badge">Dealer portal</span>
        </div>
        <h1 className="login-hero-title">
          Turn missed calls into booked service visits.
        </h1>
        <p className="login-hero-text">
          Real-time transcripts, recordings, and smart routing so your dealership never misses an opportunity.
        </p>
        <div className="login-hero-stats">
          <div className="login-hero-chip">
            <Activity size={16} />
            <div>
              <span className="login-hero-chip-label">Live calls</span>
              <span className="login-hero-chip-value">24/7</span>
            </div>
          </div>
          <div className="login-hero-chip">
            <Clock size={16} />
            <div>
              <span className="login-hero-chip-label">Response</span>
              <span className="login-hero-chip-value">&lt; 2 sec</span>
            </div>
          </div>
        </div>
        <p className="login-hero-footnote">Secure CRM access</p>
      </section>

      <section className="login-panel">
        <div className="login-card login-card--dealer">
          <h2 className="login-title">Dealer sign in</h2>
          <p className="login-subtitle">
            Use your primary DID and password to access the CRM.
          </p>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="dealer-phone" className="login-label">
                Dealer phone (primary DID)
              </label>
              <div className="login-input-wrap">
                <Phone size={18} strokeWidth={2} />
                <input
                  id="dealer-phone"
                  type="text"
                  value={dealerPhone}
                  onChange={(e) => setDealerPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  autoComplete="username"
                  className="login-input"
                />
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="dealer-password" className="login-label">
                Password
              </label>
              <div className="login-input-wrap">
                <Lock size={18} strokeWidth={2} />
                <input
                  id="dealer-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="login-input"
                />
              </div>
            </div>
            {error && (
              <div className="login-error" role="alert">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="login-submit crm-press-sm"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
          <p className="login-footer">AI Voice Agent · Dealership operations</p>
        </div>
      </section>
    </div>
  );
}

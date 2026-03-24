import { useState } from 'react';
import { User, Lock, ShieldCheck, Server } from 'lucide-react';
import { apiAdminLogin } from '../../api';
import { useToast } from '../../contexts/ToastContext';

export function AdminLoginPage() {
  const toast = useToast();
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiAdminLogin(adminId.trim(), password.trim());
      window.sessionStorage.setItem('admin_authenticated', 'true');
      toast.success('Signed in.');
      window.location.replace('/admin');
      return;
    } catch (err) {
      const msg = err.message || 'Failed to login';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-orbit login-orbit--admin" aria-hidden />
      <div className="login-grid" aria-hidden />

      <section className="login-hero login-hero--admin">
        <div className="login-hero-header">
          <div className="login-hero-logo">
            <ShieldCheck size={22} strokeWidth={2} />
          </div>
          <span className="login-hero-badge">Admin access</span>
        </div>
        <h1 className="login-hero-title">
          Configure every dealership in one place.
        </h1>
        <p className="login-hero-text">
          Secure controls for dealers, departments, hours, and AI behavior.
        </p>
        <div className="login-hero-stats">
          <div className="login-hero-chip">
            <Server size={16} />
            <div>
              <span className="login-hero-chip-label">Dealers</span>
              <span className="login-hero-chip-value">Multi-region</span>
            </div>
          </div>
          <div className="login-hero-chip">
            <Lock size={16} />
            <div>
              <span className="login-hero-chip-label">Access</span>
              <span className="login-hero-chip-value">Secure</span>
            </div>
          </div>
        </div>
        <p className="login-hero-footnote">Restricted access</p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <h2 className="login-title">Admin login</h2>
          <p className="login-subtitle">
            Enter the admin ID and password configured on the server.
          </p>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="admin-id" className="login-label">
                Admin ID
              </label>
              <div className="login-input-wrap">
                <User size={18} strokeWidth={2} />
                <input
                  id="admin-id"
                  type="text"
                  autoComplete="username"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="Enter admin ID"
                  className="login-input"
                />
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="admin-password" className="login-label">
                Password
              </label>
              <div className="login-input-wrap">
                <Lock size={18} strokeWidth={2} />
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
                  Logging in…
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>
          <p className="login-footer">Manage dealers, departments & hours</p>
        </div>
      </section>
    </div>
  );
}

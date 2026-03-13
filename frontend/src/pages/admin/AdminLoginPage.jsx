import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiAdminLogin } from '../../api';

export function AdminLoginPage() {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiAdminLogin(adminId.trim(), password);
      window.localStorage.setItem('admin_authenticated', 'true');
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
      <div className="w-full max-w-sm rounded-[8px] border border-crm-border bg-white p-6 shadow-sm">
        <h1 className="text-[18px] font-semibold text-crm-text mb-1">Admin Login</h1>
        <p className="text-[13px] text-crm-text2 mb-4">
          Enter the admin ID and password configured on the server.
        </p>
        {error && (
          <div className="mb-3 rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-crm-text mb-1">Admin ID</label>
            <input
              type="text"
              autoComplete="username"
              className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-crm-primary"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-crm-text mb-1">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full rounded-[6px] border border-crm-border px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-crm-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[6px] bg-crm-primary px-3 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}


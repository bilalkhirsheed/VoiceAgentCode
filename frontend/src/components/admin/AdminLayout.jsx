import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Database, Home, LogOut, Plus } from 'lucide-react';

export function AdminLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    window.sessionStorage.removeItem('admin_authenticated');
    navigate('/admin/login');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 crm-shell">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col border-r border-slate-800 bg-slate-900 shadow-crm-sm">
        <div className="px-4 py-5 border-b border-slate-800">
          <Link
            to="/admin"
            className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-slate-50"
          >
            <Database size={18} className="text-sky-400" />
            <span>Admin Dashboard</span>
          </Link>
          <div className="mt-1 text-[12px] text-slate-400">Manage dealers, departments & hours</div>
        </div>
        <nav className="flex-1 overflow-auto px-2 py-3">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `mb-0.5 flex h-10 items-center gap-2.5 rounded-crm px-3 text-[13px] transition-all duration-150 border-l-2 ${
                isActive
                  ? 'bg-slate-800 text-white border-l-sky-400 font-medium'
                  : 'border-l-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`
            }
          >
            <Home size={17} className="shrink-0 opacity-90" />
            <span className="truncate">Overview</span>
          </NavLink>
          <NavLink
            to="/admin/dealers"
            end
            className={({ isActive }) =>
              `mb-0.5 flex h-10 items-center gap-2.5 rounded-crm px-3 text-[13px] transition-all duration-150 border-l-2 ${
                isActive
                  ? 'bg-slate-800 text-white border-l-sky-400 font-medium'
                  : 'border-l-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`
            }
          >
            <Database size={17} className="shrink-0 opacity-90" />
            <span className="truncate">Dealers</span>
          </NavLink>
          <NavLink
            to="/admin/dealers/new"
            className={({ isActive }) =>
              `mb-0.5 flex h-10 items-center gap-2.5 rounded-crm px-3 text-[13px] transition-all duration-150 border-l-2 ${
                isActive
                  ? 'bg-slate-800 text-white border-l-sky-400 font-medium'
                  : 'border-l-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`
            }
          >
            <Plus size={17} className="shrink-0 opacity-90" />
            <span className="truncate">Add Dealer</span>
          </NavLink>
        </nav>
        <div className="mt-auto border-t border-slate-800 px-2 py-3">
          <button
            type="button"
            onClick={handleLogout}
            className="crm-press flex h-10 w-full items-center gap-2.5 rounded-crm px-3 text-[13px] text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <div className="pl-[248px]">
        <main className="crm-main px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

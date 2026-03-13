import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Database, Home, LogOut, Plus } from 'lucide-react';

export function AdminLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    window.localStorage.removeItem('admin_authenticated');
    navigate('/admin/login');
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-crm-text flex">
      <aside className="w-[220px] border-r border-crm-border bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-crm-border">
          <Link to="/admin" className="flex items-center gap-2 text-[13px] font-semibold">
            <Database size={18} />
            <span>Admin Dashboard</span>
          </Link>
          <div className="mt-1 text-[12px] text-crm-text2">Manage dealers, departments & hours</div>
        </div>
        <nav className="flex-1 px-2 py-3">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `mb-1 flex h-9 items-center gap-2 rounded-[6px] px-3 text-[13px] text-crm-text2 hover:bg-[#F3F4F6] ${
                isActive ? 'bg-[#EFF6FF] text-crm-primary' : ''
              }`
            }
          >
            <Home size={16} />
            <span>Overview</span>
          </NavLink>
          <NavLink
            to="/admin/dealers"
            className={({ isActive }) =>
              `mb-1 flex h-9 items-center gap-2 rounded-[6px] px-3 text-[13px] text-crm-text2 hover:bg-[#F3F4F6] ${
                isActive ? 'bg-[#EFF6FF] text-crm-primary' : ''
              }`
            }
          >
            <Database size={16} />
            <span>Dealers</span>
          </NavLink>
          <NavLink
            to="/admin/dealers/new"
            className={({ isActive }) =>
              `mb-1 flex h-9 items-center gap-2 rounded-[6px] px-3 text-[13px] text-crm-text2 hover:bg-[#F3F4F6] ${
                isActive ? 'bg-[#EFF6FF] text-crm-primary' : ''
              }`
            }
          >
            <Plus size={16} />
            <span>Add Dealer</span>
          </NavLink>
        </nav>
        <div className="px-3 py-3 border-t border-crm-border">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-[6px] border border-crm-border bg-white px-3 py-2 text-[12px] text-crm-text2 hover:bg-[#F3F4F6]"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-0">
        <div className="px-6 py-5">
          <Outlet />
        </div>
      </main>
    </div>
  );
}


import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import UserMenuDropdown from '@/components/common/UserMenuDropdown';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/utils/constants';
import logoDcp from '@/assets/logo-cartographie-dcp.png';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate(ROUTES.ADMIN_LOGIN, { replace: true });
  }

  return (
    <div className="min-h-screen bg-[var(--artci-gray-light)]">
      <header className="navbar-artci fixed top-0 left-0 right-0 z-50 h-[70px]">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="nav-logo flex items-center gap-3 no-underline">
              <img src={logoDcp} alt="ARTCI — Cartographie DCP" className="h-8 sm:h-10 w-auto object-contain" />
              <span className="hidden md:inline-flex items-center rounded-full bg-[var(--brand-primary-soft)] text-[var(--brand-primary-hover)] px-2.5 py-0.5 text-xs font-bold font-display">
                Administration
              </span>
            </Link>
          </div>

          {user && (
            <UserMenuDropdown
              displayName={`${user.prenom} ${user.nom}`}
              subtitle={user.role}
              profilRoute={ROUTES.ADMIN_PROFIL}
              onLogout={handleLogout}
            />
          )}
        </div>
      </header>

      <AdminSidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="pt-[70px] lg:pl-64 min-h-screen">
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

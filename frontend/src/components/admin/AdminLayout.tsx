import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/utils/constants';
import logoArtci from '@/assets/logo_artci.png';

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
      {/* Top bar */}
      <header className="navbar-artci fixed top-0 left-0 right-0 z-50 h-[70px]">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="flex items-center gap-3 no-underline">
              <img src={logoArtci} alt="ARTCI" className="w-10 h-10 object-contain" />
              <div className="hidden sm:block">
                <div className="font-bold text-sm text-[var(--artci-black)]">ARTCI</div>
                <div className="text-xs text-gray-500">Administration</div>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {user.prenom} {user.nom}
                </span>
                <span className="badge badge-conforme text-xs">{user.role}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <AdminSidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="pt-[70px] lg:pl-64 min-h-screen">
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

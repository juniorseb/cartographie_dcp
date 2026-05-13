import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import EntrepriseSidebar from '@/components/entreprise/EntrepriseSidebar';
import UserMenuDropdown from '@/components/common/UserMenuDropdown';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/utils/constants';
import logoArtci from '@/assets/logo_artci.png';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { compte, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
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
            <Link to="/" className="flex items-center gap-3 no-underline">
              <img src={logoArtci} alt="Cartographie DCP" className="w-10 h-10 object-contain" />
              <div className="hidden sm:block">
                <div className="font-bold text-sm text-[var(--artci-black)]">Cartographie DCP</div>
                <div className="text-xs text-gray-500">Espace Entreprise</div>
              </div>
            </Link>
          </div>

          {compte && (
            <UserMenuDropdown
              displayName={compte.denomination}
              subtitle={compte.email}
              profilRoute={ROUTES.ENTREPRISE_PROFIL}
              onLogout={handleLogout}
            />
          )}
        </div>
      </header>

      <EntrepriseSidebar
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

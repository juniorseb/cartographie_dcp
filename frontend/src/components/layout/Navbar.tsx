import { NavLink, Link } from 'react-router-dom';
import { Menu, X, LogIn, LayoutDashboard, Shield } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import { ROUTES } from '@/utils/constants';
import logoArtci from '@/assets/logo_artci.png';

const navLinks = [
  { to: ROUTES.MAP, label: 'Carte' },
  { to: ROUTES.ENTITES, label: 'Liste' },
  { to: ROUTES.STATISTIQUES, label: 'Statistiques' },
  { to: ROUTES.A_PROPOS, label: 'À Propos' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, userType } = useAuth();

  return (
    <nav className="navbar-artci fixed top-0 left-0 right-0 z-[1000] h-[60px] md:h-[70px]">
      <div className="h-full px-4 md:px-[30px] flex items-center justify-between">
        {/* Logo + Titre */}
        <Link to="/" className="nav-logo flex items-center gap-2 md:gap-[15px] no-underline">
          <img src={logoArtci} alt="Logo ARTCI" className="w-10 h-10 md:w-14 md:h-14 object-contain" />
          <span className="hidden sm:inline font-bold text-lg text-black">
            Cartographie DCP
          </span>
        </Link>

        {/* Desktop nav - liens texte sans icônes */}
        <div className="hidden md:flex items-center h-full">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center h-[70px] px-5 text-base font-semibold transition-all duration-200 no-underline border-b-[3px] border-transparent',
                  isActive
                    ? 'bg-[var(--artci-orange)] text-white border-[var(--artci-orange)]'
                    : 'text-black hover:bg-[var(--artci-orange)] hover:text-white'
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated && userType === 'entreprise' ? (
            <Link
              to={ROUTES.ENTREPRISE_DASHBOARD}
              className="hidden md:flex items-center gap-2 btn btn-primary py-2 px-4 text-sm no-underline"
            >
              <LayoutDashboard className="w-4 h-4" />
              Mon Espace
            </Link>
          ) : isAuthenticated && userType === 'artci' ? (
            <Link
              to={ROUTES.ADMIN_DASHBOARD}
              className="hidden md:flex items-center gap-2 btn btn-secondary py-2 px-4 text-sm no-underline"
            >
              <Shield className="w-4 h-4" />
              Administration
            </Link>
          ) : (
            <Link
              to={ROUTES.LOGIN}
              className="hidden md:flex items-center gap-2 btn btn-outline py-2 px-4 text-sm no-underline"
            >
              <LogIn className="w-4 h-4" />
              Connexion
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t shadow-lg">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center px-6 py-3 text-base font-semibold no-underline',
                  isActive
                    ? 'bg-[var(--artci-orange)] text-white'
                    : 'text-black'
                )
              }
            >
              {label}
            </NavLink>
          ))}
          {isAuthenticated && userType === 'entreprise' ? (
            <Link
              to={ROUTES.ENTREPRISE_DASHBOARD}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-6 py-3 text-sm font-semibold text-[var(--artci-orange)] no-underline border-t"
            >
              <LayoutDashboard className="w-4 h-4" />
              Mon Espace
            </Link>
          ) : isAuthenticated && userType === 'artci' ? (
            <Link
              to={ROUTES.ADMIN_DASHBOARD}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-6 py-3 text-sm font-semibold text-[var(--artci-green)] no-underline border-t"
            >
              <Shield className="w-4 h-4" />
              Administration
            </Link>
          ) : (
            <Link
              to={ROUTES.LOGIN}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-6 py-3 text-sm font-semibold text-[var(--artci-orange)] no-underline border-t"
            >
              <LogIn className="w-4 h-4" />
              Connexion
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}

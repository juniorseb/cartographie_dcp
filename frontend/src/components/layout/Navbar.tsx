import { NavLink, Link } from 'react-router-dom';
import { Menu, X, LogIn, LayoutDashboard, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import { ROUTES } from '@/utils/constants';
import logoDcp from '@/assets/logo-cartographie-dcp.png';

const navLinks = [
  { to: ROUTES.HOME, label: 'Accueil' },
  { to: ROUTES.MAP, label: 'Carte' },
  { to: ROUTES.ENTITES, label: 'Organismes' },
  { to: ROUTES.STATISTIQUES, label: 'Statistiques' },
  { to: ROUTES.A_PROPOS, label: 'À propos' },
  { to: ROUTES.CONTACT, label: 'Contact' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, userType } = useAuth();
  const isEntreprise = isAuthenticated && userType === 'entreprise';

  return (
    <nav className="navbar-artci fixed top-0 left-0 right-0 z-[1000] h-[60px] md:h-[70px]">
      <div className="h-full max-w-[1440px] mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Logo + titre */}
        <Link to={ROUTES.HOME} className="nav-logo flex items-center gap-3 no-underline min-w-0">
          <img
            src={logoDcp}
            alt="ARTCI — Cartographie DCP"
            className="h-9 md:h-11 w-auto max-w-[200px] md:max-w-none object-contain"
          />
        </Link>

        {/* Liens desktop */}
        <div className="hidden lg:flex items-center gap-1 h-full">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === ROUTES.HOME}
              className={({ isActive }) =>
                cn(
                  'relative inline-flex items-center h-full px-3 font-display text-[13px] font-bold uppercase tracking-[0.03em] no-underline transition-colors',
                  'after:absolute after:left-3 after:right-3 after:bottom-0 after:h-[3px] after:rounded-t after:transition-transform after:origin-left',
                  isActive
                    ? 'text-[var(--brand-primary)] after:bg-[var(--brand-primary)] after:scale-x-100'
                    : 'text-[var(--brand-text)] hover:text-[var(--brand-primary)] after:bg-[var(--brand-primary)] after:scale-x-0 hover:after:scale-x-100'
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Actions — la navbar publique est 100% cote ENTREPRISE.
            La plateforme admin est un univers separe (acces via /admin/connexion). */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isEntreprise ? (
            <Link to={ROUTES.ENTREPRISE_DASHBOARD} className="hidden md:inline-flex btn btn-primary py-2 px-4 text-sm">
              <LayoutDashboard className="w-4 h-4" />
              Mon espace
            </Link>
          ) : (
            <>
              <Link to={ROUTES.LOGIN} className="hidden md:inline-flex btn btn-outline py-2 px-4 text-sm">
                <LogIn className="w-4 h-4" />
                Se connecter
              </Link>
              <Link to={ROUTES.REGISTER} className="hidden md:inline-flex btn btn-primary py-2 px-4 text-sm">
                <UserPlus className="w-4 h-4" />
                S'inscrire
              </Link>
            </>
          )}

          <button
            className="lg:hidden p-2 rounded-lg text-[var(--brand-dark)] hover:bg-[var(--brand-primary-soft)]"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Menu mobile / tablette */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t shadow-lg max-h-[calc(100vh-60px)] overflow-y-auto">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === ROUTES.HOME}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center px-6 py-3 font-display text-sm font-bold uppercase tracking-[0.03em] no-underline border-l-4',
                  isActive
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                    : 'border-transparent text-[var(--brand-text)]'
                )
              }
            >
              {label}
            </NavLink>
          ))}
          <div className="flex gap-2 p-4 border-t md:hidden">
            {isEntreprise ? (
              <Link to={ROUTES.ENTREPRISE_DASHBOARD} onClick={() => setMobileOpen(false)} className="btn btn-primary flex-1 text-sm">
                <LayoutDashboard className="w-4 h-4" />
                Mon espace
              </Link>
            ) : (
              <>
                <Link to={ROUTES.LOGIN} onClick={() => setMobileOpen(false)} className="btn btn-outline flex-1 text-sm">
                  Se connecter
                </Link>
                <Link to={ROUTES.REGISTER} onClick={() => setMobileOpen(false)} className="btn btn-primary flex-1 text-sm">
                  S'inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

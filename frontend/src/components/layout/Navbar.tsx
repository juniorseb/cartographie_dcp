import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Menu, X, LogIn, LayoutDashboard, UserPlus, ChevronDown, BadgeCheck, Users, Map as MapIcon,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import { ROUTES } from '@/utils/constants';
import logoDcp from '@/assets/logo-cartographie-dcp.png';

/** Sous-menu « Organismes » : les deux vues du registre public + la carte. */
const ORGANISMES_MENU = [
  {
    to: ROUTES.ENTITES,
    vue: 'conformes',
    label: 'Organismes conformes',
    description: 'Conformes et partiellement conformes',
    icon: BadgeCheck,
  },
  {
    to: `${ROUTES.ENTITES}?vue=responsables`,
    vue: 'responsables',
    label: 'Responsables de traitement',
    description: 'Tous les organismes recensés',
    icon: Users,
  },
  {
    to: ROUTES.MAP,
    vue: null,
    label: 'Voir sur la carte',
    description: 'Localiser les organismes publiés',
    icon: MapIcon,
  },
] as const;

type NavItem = { to: string; label: string; sousMenu?: boolean };

const navLinks: NavItem[] = [
  { to: ROUTES.HOME, label: 'Accueil' },
  { to: ROUTES.MAP, label: 'Carte' },
  { to: ROUTES.ENTITES, label: 'Organismes', sousMenu: true },
  { to: ROUTES.STATISTIQUES, label: 'Statistiques' },
  { to: ROUTES.A_PROPOS, label: 'À propos' },
  { to: ROUTES.CONTACT, label: 'Contact' },
];

const lienDesktop = (actif: boolean) =>
  cn(
    'relative inline-flex items-center gap-1 h-full px-3 font-display text-[13px] font-bold uppercase tracking-[0.03em] no-underline transition-colors',
    'after:absolute after:left-3 after:right-3 after:bottom-0 after:h-[3px] after:rounded-t after:transition-transform after:origin-left after:bg-[var(--brand-primary)]',
    actif
      ? 'text-[var(--brand-primary)] after:scale-x-100'
      : 'text-[var(--brand-text)] hover:text-[var(--brand-primary)] after:scale-x-0 hover:after:scale-x-100'
  );

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOrgOuvert, setMenuOrgOuvert] = useState(false);
  const [mobileOrgOuvert, setMobileOrgOuvert] = useState(false);
  const { isAuthenticated, userType } = useAuth();
  const isEntreprise = isAuthenticated && userType === 'entreprise';
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const fermetureRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const surOrganismes = location.pathname.startsWith(ROUTES.ENTITES);
  const vueActive = new URLSearchParams(location.search).get('vue') === 'responsables' ? 'responsables' : 'conformes';

  // Fermer les menus a chaque changement de page
  useEffect(() => {
    setMenuOrgOuvert(false);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  // Fermeture du sous-menu : clic exterieur ou touche Echap
  useEffect(() => {
    if (!menuOrgOuvert) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOrgOuvert(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOrgOuvert(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOrgOuvert]);

  // Survol (souris) avec un court delai de fermeture pour ne pas perdre le menu
  const ouvrirSurvol = () => {
    if (fermetureRef.current) clearTimeout(fermetureRef.current);
    setMenuOrgOuvert(true);
  };
  const fermerSurvol = () => {
    fermetureRef.current = setTimeout(() => setMenuOrgOuvert(false), 150);
  };

  const estActifSousMenu = (vue: string | null) =>
    vue !== null && surOrganismes && vueActive === vue;

  return (
    <nav className="navbar-artci fixed top-0 left-0 right-0 z-[1000] h-[60px] md:h-[70px]">
      <div className="h-full max-w-[1440px] mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to={ROUTES.HOME} className="nav-logo flex items-center gap-3 no-underline min-w-0">
          <img
            src={logoDcp}
            alt="ARTCI — Cartographie DCP"
            className="h-9 md:h-11 w-auto max-w-[200px] md:max-w-none object-contain"
          />
        </Link>

        {/* Liens desktop */}
        <div className="hidden xl:flex items-center gap-1 h-full">
          {navLinks.map(({ to, label, sousMenu }) =>
            sousMenu ? (
              <div
                key={to}
                ref={menuRef}
                className="relative h-full"
                onMouseEnter={ouvrirSurvol}
                onMouseLeave={fermerSurvol}
              >
                <button
                  type="button"
                  className={lienDesktop(surOrganismes || menuOrgOuvert)}
                  aria-haspopup="true"
                  aria-expanded={menuOrgOuvert}
                  onClick={() => setMenuOrgOuvert((o) => !o)}
                >
                  {label}
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', menuOrgOuvert && 'rotate-180')} />
                </button>

                {menuOrgOuvert && (
                  <div className="absolute left-1/2 top-full -translate-x-1/2 pt-2 z-[1001]">
                    <div
                      role="menu"
                      className="w-[340px] rounded-[var(--radius-card)] border border-[var(--brand-gray)] bg-white p-2 shadow-hover"
                    >
                      {ORGANISMES_MENU.map(({ to: href, vue, label: l, description, icon: Icon }, i) => {
                        const actif = estActifSousMenu(vue);
                        return (
                          <div key={href}>
                            {i === 2 && <div className="my-1.5 h-px bg-[var(--brand-gray)]" />}
                            <Link
                              to={href}
                              role="menuitem"
                              onClick={() => setMenuOrgOuvert(false)}
                              className={cn(
                                'group flex items-start gap-3 rounded-xl p-3 no-underline transition-colors',
                                actif ? 'bg-[var(--brand-primary-soft)]' : 'hover:bg-[var(--brand-primary-soft)]'
                              )}
                            >
                              <span
                                className={cn(
                                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors',
                                  actif
                                    ? 'bg-[var(--brand-primary)] text-white'
                                    : 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] group-hover:bg-[var(--brand-primary)] group-hover:text-white'
                                )}
                              >
                                <Icon className="w-5 h-5" />
                              </span>
                              <span className="min-w-0">
                                <span className="block font-display text-sm font-bold text-[var(--brand-dark)]">{l}</span>
                                <span className="block text-xs text-[var(--brand-muted)]">{description}</span>
                              </span>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={to === ROUTES.HOME}
                className={({ isActive }) => lienDesktop(isActive)}
              >
                {label}
              </NavLink>
            )
          )}
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
            className="xl:hidden p-2 rounded-lg text-[var(--brand-dark)] hover:bg-[var(--brand-primary-soft)]"
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
        <div className="xl:hidden bg-white border-t shadow-lg max-h-[calc(100vh-60px)] overflow-y-auto">
          {navLinks.map(({ to, label, sousMenu }) =>
            sousMenu ? (
              <div key={to}>
                <button
                  type="button"
                  onClick={() => setMobileOrgOuvert((o) => !o)}
                  aria-expanded={mobileOrgOuvert}
                  className={cn(
                    'w-full flex items-center justify-between px-6 py-3 font-display text-sm font-bold uppercase tracking-[0.03em] border-l-4',
                    surOrganismes
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                      : 'border-transparent text-[var(--brand-text)]'
                  )}
                >
                  {label}
                  <ChevronDown className={cn('w-4 h-4 transition-transform', mobileOrgOuvert && 'rotate-180')} />
                </button>
                {mobileOrgOuvert && (
                  <div className="bg-gray-50 py-1">
                    {ORGANISMES_MENU.filter((m) => m.vue !== null).map(({ to: href, vue, label: l, icon: Icon }) => (
                      <Link
                        key={href}
                        to={href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 pl-10 pr-6 py-2.5 text-sm font-semibold no-underline',
                          estActifSousMenu(vue) ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-text)]'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {l}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
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
            )
          )}
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

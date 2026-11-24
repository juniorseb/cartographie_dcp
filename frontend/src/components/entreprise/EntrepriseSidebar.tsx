import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, FolderOpen, Bell,
  X, ChevronDown, ChevronRight, AlertTriangle, Folder, Activity, ExternalLink,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';
import { ROUTES } from '@/utils/constants';

interface SidebarChild {
  to: string;
  label: string;
}

interface SidebarLink {
  to?: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
  external?: boolean;
  subtitle?: string;
  children?: { to: string; label: string; children?: SidebarChild[] }[];
}

// Plateforme externe qui prend en charge les demandes de declaration et
// d'autorisation depuis que celles-ci ne sont plus traitees sur ce site.
const CERTINUM_APDP_URL = ROUTES.CERTINUM_URL;

const sidebarLinks: SidebarLink[] = [
  { to: ROUTES.ENTREPRISE_DASHBOARD, label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  // Entree directe (plus de regroupement "Demande" qui n'apportait rien)
  { to: ROUTES.ENTREPRISE_ENREGISTREMENT, label: 'Mon enregistrement', icon: FileText },
  { to: ROUTES.ENTREPRISE_DOSSIER, label: 'Mon dossier', icon: FolderOpen },
  { to: ROUTES.ENTREPRISE_DOCUMENTS, label: 'Mes documents', icon: Folder },
  { to: ROUTES.ENTREPRISE_JOURNAL, label: "Journal d'événements", icon: Activity },
  { to: ROUTES.ENTREPRISE_NOTIFICATIONS, label: 'Notifications', icon: Bell },
  { to: ROUTES.ENTREPRISE_SIGNALER_ERREUR, label: 'Signaler une erreur', icon: AlertTriangle },
  {
    to: CERTINUM_APDP_URL,
    label: 'Déclaration & Autorisation',
    icon: ExternalLink,
    external: true,
    subtitle: 'Sur la plateforme CERTINUM APDP',
  },
];

interface EntrepriseSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function EntrepriseSidebar({ mobileOpen, onClose }: EntrepriseSidebarProps) {
  const location = useLocation();

  // Compteur de notifications non lues (retours ARTCI) affiché en badge
  const { data: feedbacks, refetch: refetchFeedbacks } = useApi(() => entrepriseApi.getFeedbacks(), []);
  const unreadCount = (feedbacks ?? []).filter((f) => !f.is_read).length;

  // Polling auto 30s : rafraichit le badge sans avoir a recharger la page.
  // Pause si l'onglet est masque (document.hidden) pour preserver batterie.
  useEffect(() => {
    const tick = () => { if (!document.hidden) refetchFeedbacks(); };
    const interval = setInterval(tick, 30_000);
    const onVisibility = () => { if (!document.hidden) refetchFeedbacks(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refetchFeedbacks]);

  // Auto-ouvrir les parents dont un enfant est actif
  const initialExpanded: Record<string, boolean> = {};
  sidebarLinks.forEach((link) => {
    if (link.children) {
      const hasActive = link.children.some((c) =>
        location.pathname.startsWith(c.to) ||
        (c.children?.some((gc) => location.pathname.startsWith(gc.to)) ?? false)
      );
      if (hasActive) initialExpanded[link.label] = true;
    }
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>(initialExpanded);

  function toggle(label: string) {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed top-[70px] left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-40 transition-transform duration-200 overflow-y-auto',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 lg:hidden">
          <span className="font-bold text-sm">Menu</span>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {sidebarLinks.map(({ to, label, icon: Icon, end, children, external, subtitle }) => {
            // Lien externe (hors SPA - ouvre dans un nouvel onglet)
            if (to && external) {
              return (
                <a
                  key={to}
                  href={to}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="mt-3 flex flex-col gap-1 px-4 py-3 rounded-xl text-sm font-semibold no-underline text-white bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] hover:shadow-hover hover:-translate-y-0.5 transition-all"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                  </span>
                  {subtitle && (
                    <span className="pl-7 text-[11px] font-normal text-white/80">{subtitle}</span>
                  )}
                </a>
              );
            }

            // Lien simple
            if (to && !children) {
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors no-underline',
                      isActive
                        ? 'bg-[var(--brand-primary)] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    )
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {to === ROUTES.ENTREPRISE_NOTIFICATIONS && unreadCount > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </NavLink>
              );
            }

            // Lien avec enfants (collapsible)
            const isOpen = expanded[label] ?? false;
            return (
              <div key={label}>
                <button
                  onClick={() => toggle(label)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {isOpen && children && (
                  <div className="ml-7 mt-1 space-y-0.5">
                    {children.map((child) => {
                      // Niveau 2 : peut avoir des sous-enfants
                      if (child.children) {
                        const isOpen2 = expanded[child.label] ?? false;
                        return (
                          <div key={child.label}>
                            <button
                              onClick={() => toggle(child.label)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold text-gray-600 hover:bg-gray-100"
                            >
                              <span className="flex-1 text-left">{child.label}</span>
                              {isOpen2 ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                            {isOpen2 && (
                              <div className="ml-4 space-y-0.5">
                                {child.children.map((gc) => (
                                  <NavLink
                                    key={gc.to}
                                    to={gc.to}
                                    onClick={onClose}
                                    className={({ isActive }) =>
                                      cn(
                                        'block px-3 py-1.5 rounded text-xs no-underline',
                                        isActive
                                          ? 'bg-[var(--brand-primary)] text-white'
                                          : 'text-gray-600 hover:bg-gray-100'
                                      )
                                    }
                                  >
                                    {gc.label}
                                  </NavLink>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          onClick={onClose}
                          className={({ isActive }) =>
                            cn(
                              'block px-3 py-1.5 rounded text-xs no-underline',
                              isActive
                                ? 'bg-[var(--brand-primary)] text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            )
                          }
                        >
                          {child.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

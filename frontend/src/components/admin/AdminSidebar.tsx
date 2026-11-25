import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Database, Inbox, UserCheck, CheckSquare,
  Users, Upload, X, BarChart3,
  RefreshCw, Bell, ClipboardCheck,
  Settings, Archive, HardDrive, FilePlus, UserPlus, Activity, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import { ROUTES } from '@/utils/constants';
import type { Role } from '@/types/enums';

const ROLE_LEVELS: Record<Role, number> = {
  reader: 0,
  editor: 1,
  admin: 2,
  super_admin: 3,
};

function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[minRole];
}

interface SidebarLink {
  to: string;
  label: string;
  icon: React.ElementType;
  end: boolean;
  minRole: Role;
}

interface SidebarSection {
  title: string;
  links: SidebarLink[];
}

// Sidebar admin nettoyee :
// - Notifications fusionnee (une seule entree)
// - Audits supprime (doublon de Logs)
// - Auto-Recensement = filtre sur Entites, accessible via filtre - on retire l'entree separee
const sidebarSections: SidebarSection[] = [
  {
    title: 'Général',
    links: [
      { to: ROUTES.ADMIN_DASHBOARD, label: 'Tableau de bord', icon: LayoutDashboard, end: true, minRole: 'reader' },
      { to: ROUTES.ADMIN_ENTITES, label: 'Entités', icon: Database, end: true, minRole: 'reader' },
      { to: ROUTES.ADMIN_ENTITE_CREATE, label: 'Nouvelle entité', icon: FilePlus, end: false, minRole: 'editor' },
      { to: ROUTES.ADMIN_STATISTIQUES, label: 'Statistiques', icon: BarChart3, end: false, minRole: 'reader' },
      // Notifications remontees ici (juste apres Statistiques) pour acces rapide
      { to: ROUTES.ADMIN_NOTIFICATIONS, label: 'Notifications', icon: Bell, end: false, minRole: 'reader' },
    ],
  },
  {
    title: 'Workflow',
    links: [
      // Spec §5.3 : "Inscriptions à valider" reserve Admin / Super Admin
      { to: ROUTES.ADMIN_INSCRIPTIONS, label: 'Inscriptions à valider', icon: UserPlus, end: false, minRole: 'admin' },
      { to: ROUTES.ADMIN_PANIER, label: 'Mon Panier', icon: Inbox, end: false, minRole: 'editor' },
      // Spec : sidebar "Feedback" supprimee (redondante avec Notifications + commentaires dossier)
      { to: ROUTES.ADMIN_ECHEANCES_FEEDBACKS, label: 'Échéances feedbacks', icon: AlertTriangle, end: false, minRole: 'admin' },
      { to: ROUTES.ADMIN_ASSIGNATION, label: 'Assignation', icon: UserCheck, end: false, minRole: 'admin' },
      { to: ROUTES.ADMIN_VALIDATION, label: 'Validation', icon: CheckSquare, end: false, minRole: 'admin' },
      { to: ROUTES.ADMIN_SUIVI_AGENTS, label: 'Suivi des agents', icon: Activity, end: false, minRole: 'admin' },
    ],
  },
  {
    title: 'Gestion',
    links: [
      { to: ROUTES.ADMIN_FORMALITES, label: 'Formalités', icon: RefreshCw, end: false, minRole: 'admin' },
    ],
  },
  {
    title: 'Administration',
    links: [
      { to: ROUTES.ADMIN_USERS, label: 'Utilisateurs', icon: Users, end: false, minRole: 'admin' },
      { to: ROUTES.ADMIN_IMPORT, label: 'Import Excel', icon: Upload, end: false, minRole: 'admin' },
      { to: ROUTES.ADMIN_IMPORTS_HISTORIQUE, label: 'Historique Imports', icon: Archive, end: false, minRole: 'admin' },
      // Logs renommé en Journal d'événements (fusion ancien Logs + Audits)
      { to: ROUTES.ADMIN_LOGS, label: "Journal d'événements", icon: ClipboardCheck, end: false, minRole: 'admin' },
    ],
  },
  {
    title: 'Système',
    links: [
      { to: ROUTES.ADMIN_SIGNALEMENTS, label: "Signalements d'erreur", icon: AlertTriangle, end: false, minRole: 'super_admin' },
      { to: ROUTES.ADMIN_PARAMETRES, label: 'Paramètres', icon: Settings, end: false, minRole: 'super_admin' },
      { to: ROUTES.ADMIN_BACKUP, label: 'Sauvegarde', icon: HardDrive, end: false, minRole: 'super_admin' },
    ],
  },
];

interface AdminSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ mobileOpen, onClose }: AdminSidebarProps) {
  const { user } = useAuth();
  const userRole = user?.role ?? 'reader';

  // Compteur de notifications non lues affiché en badge sur le volet « Notifications »
  const { data: notifications, refetch: refetchNotifications } = useApi(
    () => adminApi.getNotifications(), []
  );
  const unreadCount = (notifications ?? []).filter((n) => !n.lue).length;

  // Compteur d'inscriptions en attente (visible admin+ uniquement)
  const canSeeInscriptions = hasMinRole(userRole, 'admin');
  const { data: pendingInscriptions, refetch: refetchInscriptions } = useApi(
    () => canSeeInscriptions ? adminApi.getInscriptions('pending') : Promise.resolve([]),
    [canSeeInscriptions]
  );
  const pendingInscriptionsCount = (pendingInscriptions ?? []).length;

  // Compteur du panier (editor+) : assignations actives + nouvelles soumissions
  const canSeePanier = hasMinRole(userRole, 'editor');
  const { data: panierResponse, refetch: refetchPanier } = useApi(
    () => canSeePanier
      ? adminApi.getPanier()
      : Promise.resolve({ assignations: [], nouvelles_soumissions: [] }),
    [canSeePanier]
  );
  // Assignations a traiter activement + nouvelles soumissions a prendre en charge
  const assignationsActives = (panierResponse?.assignations ?? []).filter(
    (a) => a.statut === 'en_cours' || a.statut === 'en_retard',
  );
  const panierCount = assignationsActives.length + (panierResponse?.nouvelles_soumissions?.length ?? 0);

  // Refresh des badges sur evenements custom dispatched par les pages metier.
  // Notifications -> 'notifications:updated' (deja existant)
  // Inscriptions  -> 'inscriptions:updated' (a dispatch dans InscriptionsPage)
  // Panier        -> 'panier:updated' (a dispatch dans PanierPage)
  useEffect(() => {
    const onNotif = () => refetchNotifications();
    const onInscr = () => refetchInscriptions();
    const onPanier = () => refetchPanier();
    window.addEventListener('notifications:updated', onNotif);
    window.addEventListener('inscriptions:updated', onInscr);
    window.addEventListener('panier:updated', onPanier);
    return () => {
      window.removeEventListener('notifications:updated', onNotif);
      window.removeEventListener('inscriptions:updated', onInscr);
      window.removeEventListener('panier:updated', onPanier);
    };
  }, [refetchNotifications, refetchInscriptions, refetchPanier]);

  // Polling auto toutes les 30s pour rafraichir les badges sans rechargement
  // de page. Pause si l'onglet est masque (document.hidden) pour economiser
  // batterie + bande passante.
  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      refetchNotifications();
      if (canSeeInscriptions) refetchInscriptions();
      if (canSeePanier) refetchPanier();
    };
    const interval = setInterval(tick, 30_000);
    // Rafraichit aussi quand l'onglet redevient visible apres une longue absence
    const onVisibility = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refetchNotifications, refetchInscriptions, refetchPanier, canSeeInscriptions, canSeePanier]);

  // Helper d'affichage du badge a cote du label
  function badgeFor(to: string): number {
    if (to === ROUTES.ADMIN_NOTIFICATIONS) return unreadCount;
    if (to === ROUTES.ADMIN_INSCRIPTIONS) return pendingInscriptionsCount;
    if (to === ROUTES.ADMIN_PANIER) return panierCount;
    return 0;
  }

  const visibleSections = sidebarSections
    .map((section) => ({
      ...section,
      links: section.links.filter((link) => hasMinRole(userRole, link.minRole)),
    }))
    .filter((section) => section.links.length > 0);

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
          <span className="font-bold text-sm">Administration</span>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-4 pb-6">
          {visibleSections.map((section) => (
            <div key={section.title}>
              <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.links.map(({ to, label, icon: Icon, end }) => {
                  const count = badgeFor(to);
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors no-underline',
                          isActive
                            ? 'bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(255,140,0,0.25)]'
                            : 'text-gray-700 hover:bg-[var(--brand-primary-soft)] hover:text-[var(--brand-dark)]'
                        )
                      }
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{label}</span>
                      {count > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold">
                          {count}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

export { hasMinRole };

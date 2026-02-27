import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Database, Inbox, UserCheck, CheckSquare,
  MessageSquare, Users, Upload, History, X, BarChart3,
  GitMerge, RefreshCw, FileCheck, Bell, FileText, ClipboardCheck,
  Settings, Archive, HardDrive, User,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
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

const sidebarSections: SidebarSection[] = [
  {
    title: 'Général',
    links: [
      { to: ROUTES.ADMIN_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, end: true, minRole: 'reader' },
      { to: ROUTES.ADMIN_ENTITES, label: 'Entités', icon: Database, end: false, minRole: 'reader' },
      { to: ROUTES.ADMIN_DEMANDES_AUTO, label: 'Auto-Recensement', icon: FileText, end: false, minRole: 'reader' },
      { to: ROUTES.ADMIN_STATISTIQUES, label: 'Statistiques', icon: BarChart3, end: false, minRole: 'reader' },
    ],
  },
  {
    title: 'Workflow',
    links: [
      { to: ROUTES.ADMIN_PANIER, label: 'Mon Panier', icon: Inbox, end: false, minRole: 'editor' },
      { to: ROUTES.ADMIN_FEEDBACKS, label: 'Feedbacks', icon: MessageSquare, end: false, minRole: 'editor' },
      { to: ROUTES.ADMIN_ASSIGNATION, label: 'Assignation', icon: UserCheck, end: false, minRole: 'admin' },
      { to: ROUTES.ADMIN_VALIDATION, label: 'Validation N+1', icon: CheckSquare, end: false, minRole: 'admin' },
    ],
  },
  {
    title: 'Gestion',
    links: [
      { to: ROUTES.ADMIN_RAPPROCHEMENTS, label: 'Rapprochements', icon: GitMerge, end: false, minRole: 'admin' },
      { to: ROUTES.ADMIN_RENOUVELLEMENTS, label: 'Renouvellements', icon: RefreshCw, end: false, minRole: 'admin' },
      { to: ROUTES.ADMIN_RAPPORTS_VALIDATION, label: 'Rapports', icon: FileCheck, end: false, minRole: 'admin' },
      { to: ROUTES.ADMIN_AUDITS, label: 'Audits', icon: ClipboardCheck, end: false, minRole: 'admin' },
    ],
  },
  {
    title: 'Administration',
    links: [
      { to: ROUTES.ADMIN_USERS, label: 'Utilisateurs', icon: Users, end: false, minRole: 'admin' },
      { to: ROUTES.ADMIN_IMPORT, label: 'Import Excel', icon: Upload, end: false, minRole: 'admin' },
      { to: ROUTES.ADMIN_IMPORTS_HISTORIQUE, label: 'Historique Imports', icon: Archive, end: false, minRole: 'admin' },
      { to: ROUTES.ADMIN_LOGS, label: 'Logs', icon: History, end: false, minRole: 'admin' },
      { to: ROUTES.ADMIN_NOTIFICATIONS, label: 'Notifications', icon: Bell, end: false, minRole: 'reader' },
    ],
  },
  {
    title: 'Système',
    links: [
      { to: ROUTES.ADMIN_PARAMETRES, label: 'Paramètres', icon: Settings, end: false, minRole: 'super_admin' },
      { to: ROUTES.ADMIN_BACKUP, label: 'Backup', icon: HardDrive, end: false, minRole: 'super_admin' },
      { to: ROUTES.ADMIN_PROFIL, label: 'Mon Profil', icon: User, end: false, minRole: 'reader' },
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
                {section.links.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors no-underline',
                        isActive
                          ? 'bg-[var(--artci-green)] text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      )
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

export { hasMinRole };

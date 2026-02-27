import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, FolderOpen, MessageSquare,
  Upload, RefreshCw, User, X, ClipboardCheck, Link2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { ROUTES } from '@/utils/constants';

const sidebarLinks = [
  { to: ROUTES.ENTREPRISE_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: ROUTES.ENTREPRISE_DEMANDE, label: 'Ma Demande', icon: FileText, end: false },
  { to: ROUTES.ENTREPRISE_DOSSIER, label: 'Mon Dossier', icon: FolderOpen, end: false },
  { to: ROUTES.ENTREPRISE_FEEDBACKS, label: 'Feedbacks', icon: MessageSquare, end: false },
  { to: ROUTES.ENTREPRISE_RAPPORTS, label: 'Rapports', icon: Upload, end: false },
  { to: ROUTES.ENTREPRISE_RENOUVELLEMENT, label: 'Renouvellement', icon: RefreshCw, end: false },
  { to: ROUTES.ENTREPRISE_AUDITS, label: 'Vérifications', icon: ClipboardCheck, end: false },
  { to: ROUTES.ENTREPRISE_RAPPROCHEMENT, label: 'Rapprochement', icon: Link2, end: false },
  { to: ROUTES.ENTREPRISE_PROFIL, label: 'Mon Profil', icon: User, end: false },
];

interface EntrepriseSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function EntrepriseSidebar({ mobileOpen, onClose }: EntrepriseSidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed top-[70px] left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-40 transition-transform duration-200',
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
          {sidebarLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors no-underline',
                  isActive
                    ? 'bg-[var(--artci-orange)] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

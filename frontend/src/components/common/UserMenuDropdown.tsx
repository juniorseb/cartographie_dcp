import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, User, LogOut } from 'lucide-react';
import { cn } from '@/utils/cn';

interface UserMenuDropdownProps {
  displayName: string;
  subtitle?: string;
  profilRoute: string;
  onLogout: () => void;
}

export default function UserMenuDropdown({
  displayName,
  subtitle,
  profilRoute,
  onLogout,
}: UserMenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = displayName
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-[var(--artci-orange)] text-white flex items-center justify-center text-xs font-bold">
          {initials || 'U'}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-gray-700 leading-tight">{displayName}</div>
          {subtitle && <div className="text-[10px] text-gray-500 leading-tight">{subtitle}</div>}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
            <div className="text-sm font-medium text-gray-700">{displayName}</div>
            {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
          </div>
          <Link
            to={profilRoute}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 no-underline"
          >
            <User className="w-4 h-4" />
            Mon profil
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}

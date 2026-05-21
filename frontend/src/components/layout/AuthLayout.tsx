import { Outlet, Link, useLocation } from 'react-router-dom';
import logoArtci from '@/assets/logo_artci.png';

export default function AuthLayout() {
  const location = useLocation();
  // Inscription : box plus large (3 sections, plusieurs champs cote a cote)
  const isWide = location.pathname === '/inscription';
  return (
    <div className="min-h-screen bg-[var(--artci-gray-light)] flex flex-col items-center justify-start p-4 pt-24 pb-8 relative">
      <Link
        to="/"
        className="absolute top-4 left-4 flex items-center gap-3 no-underline hover:opacity-80 transition-opacity"
      >
        <img src={logoArtci} alt="ARTCI" className="w-10 h-10 object-contain" />
        <div>
          <div className="font-bold text-base text-[var(--artci-black)] leading-tight">Cartographie DCP</div>
          <div className="text-xs text-gray-500 leading-tight">Protection des Données — ARTCI</div>
        </div>
      </Link>

      <div
        className={`card w-full ${isWide ? 'max-w-3xl' : 'max-w-md'}`}
        style={{ borderRadius: 0 }}
      >
        <Outlet />
      </div>
    </div>
  );
}

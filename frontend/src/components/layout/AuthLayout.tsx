import { Outlet, Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import logoArtci from '@/assets/logo_artci.png';

export default function AuthLayout() {
  const location = useLocation();
  // Inscription : box plus large (3 sections, plusieurs champs cote a cote)
  const isWide = location.pathname === '/inscription';
  return (
    <div className="min-h-screen bg-[var(--artci-gray-light)] flex flex-col items-center justify-center p-4 py-8 relative">
      <Link
        to="/"
        className="absolute top-4 left-4 flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[var(--artci-orange)] no-underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à l'accueil
      </Link>

      <Link to="/" className="mb-8 flex items-center gap-3 no-underline">
        <img src={logoArtci} alt="ARTCI" className="w-12 h-12 object-contain" />
        <div>
          <div className="font-bold text-lg text-[var(--artci-black)]">ARTCI</div>
          <div className="text-sm text-gray-500">Protection des Données</div>
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

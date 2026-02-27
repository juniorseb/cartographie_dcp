import { Outlet, Link } from 'react-router-dom';
import logoArtci from '@/assets/logo_artci.png';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-[var(--artci-gray-light)] flex flex-col items-center justify-center p-4">
      <Link to="/" className="mb-8 flex items-center gap-3 no-underline">
        <img src={logoArtci} alt="ARTCI" className="w-12 h-12 object-contain" />
        <div>
          <div className="font-bold text-lg text-[var(--artci-black)]">ARTCI</div>
          <div className="text-sm text-gray-500">Protection des Données</div>
        </div>
      </Link>
      <div className="card card-orange w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}

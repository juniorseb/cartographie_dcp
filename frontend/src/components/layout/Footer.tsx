import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <p>&copy; {new Date().getFullYear()} ARTCI - Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire</p>
        <div className="flex items-center gap-4">
          <Link to={ROUTES.A_PROPOS} className="text-gray-300 hover:text-white no-underline">À propos</Link>
          <Link to={ROUTES.CONTACT} className="text-gray-300 hover:text-white no-underline">Contact</Link>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 mt-2 text-center text-xs text-gray-400">
        Conforme à la Loi N°2013-450 relative à la protection des données personnelles
      </div>
    </footer>
  );
}

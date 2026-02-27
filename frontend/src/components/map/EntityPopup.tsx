import { Link } from 'react-router-dom';
import type { EntiteListItem } from '@/types/entite';
import StatusBadge from '@/components/common/StatusBadge';

interface EntityPopupProps {
  entite: EntiteListItem;
}

export default function EntityPopup({ entite }: EntityPopupProps) {
  return (
    <div className="p-4 min-w-[280px] max-w-[300px]">
      {/* Nom */}
      <h4 className="font-bold text-lg mb-1 text-black leading-tight">
        {entite.denomination}
      </h4>

      {/* Secteur */}
      {entite.secteur_activite && (
        <p className="text-sm text-gray-500 mb-1">{entite.secteur_activite}</p>
      )}

      {/* Localisation */}
      {entite.ville && (
        <p className="text-sm text-gray-500 mb-4">
          {entite.ville}{entite.region ? `, ${entite.region}` : ''}
        </p>
      )}

      {/* Statut */}
      <div className="mb-4">
        <span className="text-sm text-black">Statut : </span>
        <StatusBadge statut={entite.statut_conformite} />
      </div>

      {/* Finalités de traitement */}
      {entite.finalites_top && entite.finalites_top.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-bold text-black mb-2">Finalités de traitement :</p>
          <ul className="space-y-1">
            {entite.finalites_top.map((f, i) => (
              <li key={i} className="text-[13px] text-gray-700">
                &bull; {f.nom} : {f.pourcentage}%
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bouton Voir Détails */}
      <Link
        to={`/entites/${entite.id}`}
        className="popup-btn block w-full text-center py-3 bg-[#FF8C00] text-white font-bold text-sm rounded hover:bg-[#E67E00] transition-colors no-underline"
      >
        Voir Détails
      </Link>
    </div>
  );
}

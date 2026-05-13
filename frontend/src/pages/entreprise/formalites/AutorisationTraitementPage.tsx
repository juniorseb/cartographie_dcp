import { FilePlus2, Lock } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';

export default function AutorisationTraitementPage() {
  const { data: dossier } = useApi(() => entrepriseApi.getMonDossier(), []);
  const active = dossier?.conformite?.formalite_autorisation_active === true;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-2 flex items-center gap-2">
        <FilePlus2 className="w-6 h-6 text-[var(--artci-green)]" />
        Autorisation — Traitement
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Demander une autorisation préalable pour le traitement de données sensibles
        (santé, biométriques, génétiques, judiciaires, etc.).
      </p>

      {!active ? (
        <div className="card text-center py-10 text-gray-500">
          <Lock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">
            Cette formalité sera disponible une fois que l'ARTCI aura activé l'onglet
            « Autorisation » sur votre dossier.
          </p>
        </div>
      ) : (
        <div className="card">
          <p className="text-sm text-gray-700 mb-4">
            Formulaire de demande d'autorisation pour un traitement à venir.
          </p>
        </div>
      )}
    </div>
  );
}

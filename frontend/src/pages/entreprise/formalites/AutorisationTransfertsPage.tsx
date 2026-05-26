import { Globe, Lock } from 'lucide-react';

export default function AutorisationTransfertsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-2 flex items-center gap-2">
        <Globe className="w-6 h-6 text-[var(--artci-green)]" />
        Autorisation — Transferts internationaux
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Demander une autorisation préalable de l'ARTCI pour le transfert de données
        personnelles hors de l'espace CEDEAO (article 7 et 26 de la Loi n°2013-450).
      </p>

      <div className="card text-center py-10 text-gray-500">
        <Lock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">Cette formalité n'est pas disponible.</p>
      </div>
    </div>
  );
}

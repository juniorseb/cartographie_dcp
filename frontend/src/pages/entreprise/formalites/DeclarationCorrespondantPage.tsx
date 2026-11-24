import { FileText, Lock } from 'lucide-react';

export default function DeclarationCorrespondantPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-2 flex items-center gap-2">
        <FileText className="w-6 h-6 text-[var(--brand-primary)]" />
        Déclaration — Correspondant à la protection des données
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Désigner ou changer votre Correspondant à la Protection des Données auprès de l'ARTCI.
      </p>

      <div className="card text-center py-10 text-gray-500">
        <Lock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">Cette formalité n'est pas disponible.</p>
      </div>
    </div>
  );
}

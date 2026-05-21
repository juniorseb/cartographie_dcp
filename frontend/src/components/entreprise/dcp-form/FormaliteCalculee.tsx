/**
 * Affichage calcule en temps reel du type de formalite applicable
 * (Autorisation prealable vs Declaration prealable).
 * Spec §3.5, §3.7 - moteur de regles miroir backend.
 */
import { ShieldAlert, FileText, Info } from 'lucide-react';
import type { FormulaireDCP } from '@/types/formulaire-dcp';

interface Result {
  type: 'autorisation_prealable' | 'declaration_prealable' | 'aucune';
  motifs: string[];
}

const NUMEROS_AUTORISATION = new Set([
  'cni', 'niu', 'cmu', 'passeport', 'titre_sejour',
  'permis_conduire', 'n_securite_sociale', 'matricule_employe',
]);

export function determinerFormalite(form: FormulaireDCP): Result {
  const motifs: string[] = [];
  const cats = form.registre?.categories_donnees ?? {};
  const finalites = form.registre?.finalites ?? [];

  // Categories declenchant autorisation
  if (cats.genetiques?.items_coches?.length) motifs.push('Données génétiques');
  if (cats.sante?.items_coches?.length) motifs.push('Données médicales / de santé');
  if (cats.judiciaires?.items_coches?.length) motifs.push('Infractions, condamnations et mesures de sûreté');
  if (cats.biometriques?.items_coches?.length) motifs.push('Données biométriques');

  // Numeros officiels (sous-ensemble) ou numero de telephone (identification)
  const numItems = cats.numeros_officiels?.items_coches ?? [];
  if (numItems.some((i) => NUMEROS_AUTORISATION.has(i))) {
    motifs.push("Numéro national d'identification");
  }
  const idItems = cats.identification?.items_coches ?? [];
  if (idItems.includes('numero_telephone')) {
    motifs.push('Numéros de téléphone');
  }

  // Finalites Interet public
  if (finalites.includes('recherche_statistiques')) {
    motifs.push('Traitement à des fins de recherche / statistiques (intérêt public)');
  }

  if (motifs.length > 0) {
    return { type: 'autorisation_prealable', motifs };
  }

  // S'il y a au moins un traitement declare → declaration prealable
  const hasTraitement = (form.registre?.activites_traitement?.length ?? 0) > 0
    || Object.values(cats).some((c) => (c?.items_coches?.length ?? 0) > 0);
  if (hasTraitement) {
    return {
      type: 'declaration_prealable',
      motifs: ['Régime de droit commun applicable à tout traitement de données personnelles'],
    };
  }

  return { type: 'aucune', motifs: ['Aucun traitement déclaré pour le moment'] };
}

export default function FormaliteCalculee({ form }: { form: FormulaireDCP }) {
  const { type, motifs } = determinerFormalite(form);

  if (type === 'autorisation_prealable') {
    return (
      <div className="border-2 border-orange-300 bg-orange-50 p-4 mb-4 rounded">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-base text-orange-900">
              Formalité applicable : <span className="uppercase">Autorisation préalable</span>
            </h3>
            <p className="text-sm text-orange-800 mt-1">
              Selon la Loi N°2013-450 (articles 7 et 26), votre traitement nécessite
              une <strong>autorisation préalable</strong> de l'ARTCI pour les motifs suivants :
            </p>
            <ul className="list-disc list-inside text-sm text-orange-700 mt-2 space-y-0.5">
              {motifs.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'declaration_prealable') {
    return (
      <div className="border-2 border-orange-300 bg-orange-50 p-4 mb-4 rounded">
        <div className="flex items-start gap-3">
          <FileText className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-base text-orange-900">
              Formalité applicable : <span className="uppercase">Déclaration préalable</span>
            </h3>
            <p className="text-sm text-orange-800 mt-1">
              Régime de droit commun applicable à tout traitement de données personnelles.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 bg-gray-50 p-4 mb-4 rounded">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-gray-700">
            Le type de formalité applicable sera déterminé automatiquement après que vous ayez
            renseigné les catégories de données traitées.
          </p>
        </div>
      </div>
    </div>
  );
}

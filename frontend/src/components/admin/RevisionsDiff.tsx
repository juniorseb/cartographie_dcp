/**
 * Vue diff entre revisions du dossier (modele PR §6.2 + L2 spec).
 *
 * Mode SEMANTIQUE par defaut :
 * - Compteur global : « X rubriques modifiees, Y champs modifies »
 * - Par rubrique : tableau des champs modifies avec valeur AVANT (rouge,
 *   barree) et valeur APRES (vert).
 * - Listes (multi-selects) : affichage des elements ajoutes / retires.
 * - Documents uploades : message « Document remplace » (logique simple).
 *
 * Permet a l'agent de ne PAS relire tout le dossier a chaque cycle.
 */
import { useEffect, useState } from 'react';
import { GitBranch, ChevronDown, FileEdit, Plus, Minus, ArrowRight } from 'lucide-react';
import * as adminApi from '@/api/admin.api';
import type { DossierRevisionItem, DiffRevisionsDetailResponse, ChampDiff } from '@/api/admin.api';

const RUBRIQUES_LABELS: Record<string, string> = {
  identification: 'Partie 1 — Identification',
  cadre_juridique: 'Partie 2 — Cadre juridique',
  registre: 'Partie 3 — Registre & traitements',
  sous_traitance_transferts: 'Partie 4 — Sous-traitance & transferts',
  securite: 'Partie 5 — Sécurité & formation',
};

// Libelles humains des champs frequents (pour ne pas afficher les cles techniques)
const CHAMPS_LABELS: Record<string, string> = {
  'statut_juridique': 'Statut juridique',
  'volume_donnees': 'Volume de données',
  'secteur_activite': "Secteur d'activité",
  'secteur_autre': 'Précision secteur',
  'localisation.latitude': 'Latitude',
  'localisation.longitude': 'Longitude',
  'personne_morale.denomination_officielle': 'Dénomination officielle',
  'personne_morale.numero_cc': 'Numéro CC',
  'personne_morale.adresse_siege': 'Adresse du siège',
  'personne_morale.ville': 'Ville',
  'personne_morale.region': 'Région',
  'responsable_legal.nom_prenom': 'RL — Nom & prénom',
  'responsable_legal.email': 'RL — Email',
  'connaissance_loi_2013': 'Connaissance Loi 2013-450',
  'dpo_habilite': 'DPO habilité ARTCI',
  'dpo_type': 'Type DPO (interne/externe)',
  'dpo_externe_type': 'DPO externe : physique/morale',
  'dpo_courrier_habilitation_uploaded': 'Courrier habilitation DPO',
  'distinction_decl_aut': 'Distinction Déclaration/Autorisation',
  'formalites_effectuees': 'Formalités effectuées',
  'activites_traitement': 'Activités de traitement',
  'registre_tenu': 'Registre tenu',
  'forme_registre': 'Forme du registre',
  'categories_personnes': 'Catégories de personnes',
  'categories_donnees': 'Catégories de données',
  'finalites': 'Finalités',
  'finalite_explicite': 'Finalité explicite',
  'bases_legales': 'Bases légales',
  'mode_traitement': 'Mode de traitement',
  'recours_sous_traitants': 'Recours à sous-traitants',
  'contrats_sous_traitance': 'Contrats sous-traitance',
  'transfert_hors_cedeao': 'Transfert hors CEDEAO',
  'pays_transferts': 'Pays de transfert',
  'autorisation_artci_transfert': 'Autorisation ARTCI transfert',
  'politique_securite': 'Charte protection données',
  'charte_uploaded': 'Charte uploadée',
  'mesures_techniques_list': 'Mesures techniques',
  'mesures_organisationnelles_list': 'Mesures organisationnelles',
  'violation_12mois': 'Violation 12 derniers mois',
  'personnel_sensibilise': 'Personnel sensibilisé',
};

function labelChamp(cle: string): string {
  if (CHAMPS_LABELS[cle]) return CHAMPS_LABELS[cle];
  // Fallback : derniere partie de la cle pointee, capitalisee
  const last = cle.split('.').pop() ?? cle;
  return last.replace(/_/g, ' ');
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  if (Array.isArray(v)) {
    if (v.length === 0) return '(vide)';
    return v.map((x) => String(x)).join(', ');
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function isDocumentUpload(cle: string, before: unknown, after: unknown): boolean {
  // Heuristique : si la cle contient 'uploaded' ou 'document' et le booleen passe
  if (cle.includes('uploaded') || cle.includes('document')) return true;
  if (typeof before === 'boolean' && typeof after === 'boolean') return cle.toLowerCase().includes('upload');
  return false;
}

interface RevisionsDiffProps {
  entiteId: string;
}

export default function RevisionsDiff({ entiteId }: RevisionsDiffProps) {
  const [revisions, setRevisions] = useState<DossierRevisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromRev, setFromRev] = useState<number | null>(null);
  const [toRev, setToRev] = useState<number | null>(null);
  const [diff, setDiff] = useState<DiffRevisionsDetailResponse | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    adminApi.listRevisions(entiteId)
      .then((revs) => {
        setRevisions(revs);
        if (revs.length >= 2) {
          setFromRev(revs[revs.length - 2].numero_revision);
          setToRev(revs[revs.length - 1].numero_revision);
        } else if (revs.length === 1) {
          setFromRev(revs[0].numero_revision);
          setToRev(revs[0].numero_revision);
        }
      })
      .catch(() => setError("Impossible de charger les révisions."))
      .finally(() => setLoading(false));
  }, [entiteId]);

  useEffect(() => {
    if (!fromRev || !toRev || fromRev === toRev) {
      setDiff(null);
      return;
    }
    setDiffLoading(true);
    adminApi.diffRevisionsDetail(entiteId, fromRev, toRev)
      .then(setDiff)
      .catch(() => setError("Impossible de calculer le diff."))
      .finally(() => setDiffLoading(false));
  }, [entiteId, fromRev, toRev]);

  if (loading) return null;
  if (revisions.length === 0) return null;

  return (
    <details className="card mb-4" open={!!(diff && diff.total_rubriques_modifiees > 0)}>
      <summary className="cursor-pointer font-bold text-lg flex items-center gap-2 flex-wrap">
        <GitBranch className="w-5 h-5 text-[var(--artci-orange)]" />
        Historique & diff des révisions
        <span className="text-xs font-normal text-gray-500 ml-2">
          ({revisions.length} révision{revisions.length > 1 ? 's' : ''})
        </span>
        {diff && diff.total_rubriques_modifiees > 0 && (
          <span className="text-xs font-medium bg-orange-100 text-orange-800 px-2 py-0.5 rounded ml-2">
            {diff.total_rubriques_modifiees} rubrique(s), {diff.total_champs_modifies} champ(s) modifié(s)
          </span>
        )}
        <ChevronDown className="w-4 h-4 ml-auto" />
      </summary>

      <div className="mt-4">
        {error && <div className="alert alert-danger text-xs mb-2">{error}</div>}

        {/* Timeline des revisions */}
        <div className="space-y-1 mb-4">
          {revisions.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 text-sm border border-gray-200 rounded p-2"
            >
              <span className="bg-[var(--artci-orange)] text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">
                #{r.numero_revision}
              </span>
              <span className="text-xs text-gray-500 flex-1">
                Soumise le {r.soumis_le ? new Date(r.soumis_le).toLocaleString('fr-FR') : '-'}
                {r.statut_au_moment && (
                  <span className="ml-2 badge badge-achevee text-[10px]">
                    {r.statut_au_moment}
                  </span>
                )}
              </span>
              {r.score_automatique_snapshot !== null && (
                <span className="text-xs font-mono text-gray-600">
                  Score auto : {r.score_automatique_snapshot}/100
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Selecteur de comparaison */}
        {revisions.length >= 2 && (
          <div className="flex items-end gap-2 mb-4 p-3 bg-gray-50 rounded">
            <div className="form-group mb-0">
              <label className="text-xs font-semibold">Comparer de</label>
              <select
                value={fromRev ?? ''}
                onChange={(e) => setFromRev(parseInt(e.target.value, 10) || null)}
                className="text-sm"
              >
                {revisions.map((r) => (
                  <option key={r.id} value={r.numero_revision}>
                    Révision #{r.numero_revision}
                  </option>
                ))}
              </select>
            </div>
            <span className="pb-2 text-gray-400">→</span>
            <div className="form-group mb-0">
              <label className="text-xs font-semibold">à</label>
              <select
                value={toRev ?? ''}
                onChange={(e) => setToRev(parseInt(e.target.value, 10) || null)}
                className="text-sm"
              >
                {revisions.map((r) => (
                  <option key={r.id} value={r.numero_revision}>
                    Révision #{r.numero_revision}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Diff semantique : par rubrique, champs avec avant/apres */}
        {diffLoading && <p className="text-xs text-gray-500">Calcul du diff…</p>}
        {diff && !diffLoading && (
          <div>
            {/* Ancres rapides */}
            {diff.total_rubriques_modifiees > 0 && (
              <p className="text-xs text-gray-600 mb-3">
                Cliquez pour aller au détail :{' '}
                {Object.entries(diff.rubriques)
                  .filter(([, r]) => r.etat !== 'inchangee')
                  .map(([cle]) => (
                    <a
                      key={cle}
                      href={`#diff-${cle}`}
                      className="inline-block mr-2 text-[var(--artci-orange)] hover:underline"
                    >
                      {RUBRIQUES_LABELS[cle] ?? cle}
                    </a>
                  ))}
              </p>
            )}

            {Object.entries(diff.rubriques)
              .filter(([, r]) => r.etat !== 'inchangee')
              .map(([rubKey, rub]) => (
                <div
                  key={rubKey}
                  id={`diff-${rubKey}`}
                  className="border border-orange-200 bg-orange-50 rounded mb-3"
                >
                  <div className="px-3 py-2 bg-orange-100 border-b border-orange-200 flex items-center gap-2">
                    <FileEdit className="w-4 h-4 text-orange-700" />
                    <span className="font-semibold text-sm text-orange-900">
                      {RUBRIQUES_LABELS[rubKey] ?? rubKey}
                    </span>
                    <span className="ml-auto text-[10px] text-orange-700 font-medium">
                      {rub.etat === 'ajoutee' ? 'Rubrique ajoutée' :
                       rub.etat === 'supprimee' ? 'Rubrique supprimée' :
                       `${rub.champs.length} champ(s) modifié(s)`}
                    </span>
                  </div>
                  {rub.champs.length === 0 ? (
                    <div className="p-3 text-xs text-gray-500 italic">
                      {rub.etat === 'ajoutee' && "Cette rubrique n'existait pas dans la révision précédente."}
                      {rub.etat === 'supprimee' && "Cette rubrique a été retirée."}
                    </div>
                  ) : (
                    <ul className="divide-y divide-orange-100">
                      {rub.champs.map((champ) => (
                        <li key={champ.cle} className="p-3">
                          <p className="text-xs font-semibold text-gray-700 mb-1">
                            {labelChamp(champ.cle)}
                            <span className="font-mono text-gray-400 ml-2 text-[10px]">{champ.cle}</span>
                          </p>
                          <ChampDiffRenderer champ={champ} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

            {diff.total_rubriques_modifiees === 0 && (
              <p className="text-sm text-gray-500 italic">
                Aucune modification entre les révisions #{fromRev} et #{toRev}.
              </p>
            )}
          </div>
        )}

        {revisions.length < 2 && (
          <p className="text-xs text-gray-500 italic">
            Une seule révision pour le moment — le diff sera disponible dès la prochaine re-soumission de l'entreprise.
          </p>
        )}
      </div>
    </details>
  );
}

function ChampDiffRenderer({ champ }: { champ: ChampDiff }) {
  // Cas document upload
  if (isDocumentUpload(champ.cle, champ.avant, champ.apres)) {
    return (
      <p className="text-xs text-gray-700 italic">
        Document {champ.apres ? 'téléversé' : 'retiré'}
        {' '}(avant : {champ.avant ? 'téléversé' : 'absent'}, après : {champ.apres ? 'téléversé' : 'absent'}).
      </p>
    );
  }

  // Cas multi-sélection (liste)
  if (champ.type === 'liste') {
    return (
      <div className="space-y-1">
        {(champ.ajoutes ?? []).length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Plus className="w-3 h-3 text-green-700 flex-shrink-0" />
            <span className="text-xs text-green-700 font-semibold">Ajouté(s) :</span>
            {(champ.ajoutes ?? []).map((v, i) => (
              <span key={i} className="text-xs bg-green-100 text-green-900 border border-green-200 px-1.5 py-0.5 rounded">
                {String(v)}
              </span>
            ))}
          </div>
        )}
        {(champ.retires ?? []).length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Minus className="w-3 h-3 text-red-700 flex-shrink-0" />
            <span className="text-xs text-red-700 font-semibold">Retiré(s) :</span>
            {(champ.retires ?? []).map((v, i) => (
              <span key={i} className="text-xs bg-red-100 text-red-900 border border-red-200 line-through px-1.5 py-0.5 rounded">
                {String(v)}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Cas scalaire (avant -> apres)
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs">
      <span className="bg-red-50 text-red-800 border border-red-200 line-through px-2 py-1 rounded">
        {formatValue(champ.avant)}
      </span>
      <ArrowRight className="w-3 h-3 text-gray-400" />
      <span className="bg-green-50 text-green-800 border border-green-200 px-2 py-1 rounded">
        {formatValue(champ.apres)}
      </span>
    </div>
  );
}

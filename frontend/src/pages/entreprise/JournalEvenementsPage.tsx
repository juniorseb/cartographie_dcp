/**
 * Page « Journal d'événements » cote entreprise (spec E2).
 *
 * Historise tous les evenements lies a l'enregistrement de l'entreprise :
 * - actions ARTCI (assignation, validation, rejet, retour, publication)
 * - actions entreprise (creation, soumission, modification, signalement)
 *
 * Pendant logique de la page admin "Journal d'evenements".
 */
import { useCallback } from 'react';
import { Activity, ArrowRight } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { formatDateTime } from '@/utils/format';

const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  brouillon_artci: 'Brouillon (saisie ARTCI)',
  soumis: 'Soumis',
  en_verification: 'En vérification',
  en_attente_complements: 'En attente de compléments',
  conforme_sous_reserve: 'Conforme sous réserve',
  valide: 'Validé',
  rejete: 'Rejeté',
  publie: 'Publié',
};

function labelStatut(s: string | undefined): string {
  if (!s) return '—';
  return STATUT_LABELS[s] ?? s.replace(/_/g, ' ');
}

export default function JournalEvenementsPage() {
  const fetcher = useCallback(() => entrepriseApi.getJournalEvenements(), []);
  const { data, isLoading, error, refetch } = useApi(fetcher, []);

  if (isLoading) return <Loading fullPage text="Chargement du journal…" />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  const events = data ?? [];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <Activity className="w-7 h-7 text-[var(--artci-orange)]" />
        Journal d'événements
      </h1>

      <p className="text-sm text-gray-500 mb-6">
        Historique complet des étapes de votre enregistrement (actions ARTCI et
        actions de votre entreprise).
      </p>

      {events.length === 0 ? (
        <EmptyState title="Aucun événement" description="L'historique apparaîtra ici dès qu'une action sera enregistrée sur votre dossier." />
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <div key={ev.id} className="border border-gray-200 rounded-lg p-3 bg-white flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-[var(--artci-orange)] flex-shrink-0 mt-2" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  {ev.ancien_statut && (
                    <>
                      <span className="badge badge-encours text-xs">{labelStatut(ev.ancien_statut)}</span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                    </>
                  )}
                  {ev.nouveau_statut && (
                    <span className="badge badge-achevee text-xs">{labelStatut(ev.nouveau_statut)}</span>
                  )}
                </div>
                {ev.commentaire && (
                  <p className="text-sm text-gray-700 mt-1">{ev.commentaire}</p>
                )}
                <div className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-2">
                  {ev.modifie_par_nom && <span>par <strong>{ev.modifie_par_nom}</strong></span>}
                  {ev.date && <span>• {formatDateTime(ev.date)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

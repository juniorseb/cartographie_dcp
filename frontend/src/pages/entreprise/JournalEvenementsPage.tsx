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
import { Activity, ArrowRight, AlertTriangle, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';
import type { JournalEvenementItem } from '@/api/entreprise.api';
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

/**
 * Style visuel par source d'evenement :
 * - historique_statut  -> transition de workflow (orange ARTCI)
 * - evenement_dossier  -> action admin (retour, validation, publication, score)
 * - signalement        -> signalement cree par l'entreprise (jaune)
 */
function getEventVisual(ev: JournalEvenementItem): {
  Icon: typeof Activity;
  iconClass: string;
  bulletClass: string;
  badgeLabel: string;
  badgeClass: string;
} {
  const source = ev.source ?? 'historique_statut';
  if (source === 'signalement') {
    return {
      Icon: AlertTriangle,
      iconClass: 'text-yellow-600',
      bulletClass: 'bg-yellow-500',
      badgeLabel: 'Signalement',
      badgeClass: 'bg-yellow-100 text-yellow-800',
    };
  }
  if (source === 'evenement_dossier') {
    // On affine selon le contenu (le backend met le type lisible dans commentaire)
    const commentaire = (ev.commentaire ?? '').toLowerCase();
    if (commentaire.includes('retour')) {
      return {
        Icon: RotateCcw,
        iconClass: 'text-orange-600',
        bulletClass: 'bg-orange-500',
        badgeLabel: 'Retour ARTCI',
        badgeClass: 'bg-orange-100 text-orange-800',
      };
    }
    if (
      commentaire.includes('validation') ||
      commentaire.includes('publication') ||
      commentaire.includes('publié')
    ) {
      return {
        Icon: CheckCircle2,
        iconClass: 'text-green-600',
        bulletClass: 'bg-green-500',
        badgeLabel: 'Validation',
        badgeClass: 'bg-green-100 text-green-800',
      };
    }
    return {
      Icon: Activity,
      iconClass: 'text-blue-600',
      bulletClass: 'bg-blue-500',
      badgeLabel: 'Action ARTCI',
      badgeClass: 'bg-blue-100 text-blue-800',
    };
  }
  // historique_statut par defaut
  return {
    Icon: Activity,
    iconClass: 'text-[var(--brand-primary)]',
    bulletClass: 'bg-[var(--brand-primary)]',
    badgeLabel: 'Workflow',
    badgeClass: 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]',
  };
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
        <Activity className="w-7 h-7 text-[var(--brand-primary)]" />
        Journal d'événements
      </h1>

      <p className="text-sm text-gray-500 mb-6">
        Historique complet de votre dossier : transitions de workflow, actions
        de l'ARTCI (retours, validations, publications) et signalements émis
        par votre entreprise.
      </p>

      {events.length === 0 ? (
        <EmptyState title="Aucun événement" description="L'historique apparaîtra ici dès qu'une action sera enregistrée sur votre dossier." />
      ) : (
        <div className="space-y-2">
          {events.map((ev) => {
            const v = getEventVisual(ev);
            const Icon = v.Icon;
            const hasStatutTransition = ev.ancien_statut || ev.nouveau_statut;
            return (
              <div key={ev.id} className="border border-gray-200 rounded-lg p-3 bg-white flex items-start gap-3">
                <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${v.iconClass}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${v.badgeClass}`}>
                      {v.badgeLabel}
                    </span>
                    {hasStatutTransition && (
                      <>
                        {ev.ancien_statut && (
                          <>
                            <span className="badge badge-encours text-xs">{labelStatut(ev.ancien_statut)}</span>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                          </>
                        )}
                        {ev.nouveau_statut && (
                          <span className="badge badge-achevee text-xs">{labelStatut(ev.nouveau_statut)}</span>
                        )}
                      </>
                    )}
                  </div>
                  {ev.commentaire && (
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{ev.commentaire}</p>
                  )}
                  <div className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-2">
                    {ev.modifie_par_nom && <span>par <strong>{ev.modifie_par_nom}</strong></span>}
                    {ev.date && <span>• {formatDateTime(ev.date)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

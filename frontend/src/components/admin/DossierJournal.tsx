/**
 * Panneau « Journal d'evenements » d'un dossier — vue admin/editeur.
 *
 * Pendant cote ARTCI de la page entreprise JournalEvenementsPage.
 * Agrege transitions de statut + retours admin + validations N+1 +
 * publications + signalements emis par l'entreprise.
 */
import { useCallback, useState } from 'react';
import {
  Activity, ArrowRight, AlertTriangle, RotateCcw, CheckCircle2, ChevronDown, History,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import type { JournalDossierItem } from '@/api/admin.api';
import Loading from '@/components/common/Loading';
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

function getEventVisual(ev: JournalDossierItem): {
  Icon: typeof Activity;
  iconClass: string;
  badgeLabel: string;
  badgeClass: string;
} {
  const source = ev.source ?? 'historique_statut';
  if (source === 'signalement') {
    return {
      Icon: AlertTriangle,
      iconClass: 'text-yellow-600',
      badgeLabel: 'Signalement entreprise',
      badgeClass: 'bg-yellow-100 text-yellow-800',
    };
  }
  if (source === 'evenement_dossier') {
    const txt = (ev.nouveau_statut ?? ev.commentaire ?? '').toLowerCase();
    if (txt.includes('retour')) {
      return {
        Icon: RotateCcw,
        iconClass: 'text-orange-600',
        badgeLabel: 'Retour à l\'entreprise',
        badgeClass: 'bg-orange-100 text-orange-800',
      };
    }
    if (txt.includes('validation') || txt.includes('publi')) {
      return {
        Icon: CheckCircle2,
        iconClass: 'text-green-600',
        badgeLabel: 'Validation / publication',
        badgeClass: 'bg-green-100 text-green-800',
      };
    }
    return {
      Icon: Activity,
      iconClass: 'text-blue-600',
      badgeLabel: 'Action ARTCI',
      badgeClass: 'bg-blue-100 text-blue-800',
    };
  }
  return {
    Icon: Activity,
    iconClass: 'text-[var(--brand-primary)]',
    badgeLabel: 'Workflow',
    badgeClass: 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]',
  };
}

interface Props {
  entiteId: string;
  /** Replie par defaut pour ne pas alourdir la page de traitement. */
  defaultOpen?: boolean;
}

export default function DossierJournal({ entiteId, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const fetcher = useCallback(() => adminApi.getJournalDossier(entiteId), [entiteId]);
  const { data, isLoading } = useApi(fetcher, [entiteId]);
  const events = data ?? [];

  return (
    <div className="card mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="font-bold text-sm flex items-center gap-2">
          <History className="w-4 h-4 text-[var(--brand-primary)]" />
          Journal d'événements du dossier
          {events.length > 0 && (
            <span className="text-xs text-gray-500 font-normal">({events.length})</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {isLoading ? (
            <Loading text="Chargement..." />
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Aucun événement enregistré.</p>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => {
                const v = getEventVisual(ev);
                const Icon = v.Icon;
                const hasTransition = ev.ancien_statut || ev.nouveau_statut;
                return (
                  <div key={ev.id} className="border border-gray-200 rounded-lg p-3 bg-white flex items-start gap-3">
                    <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${v.iconClass}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${v.badgeClass}`}>
                          {v.badgeLabel}
                        </span>
                        {hasTransition && (
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
      )}
    </div>
  );
}

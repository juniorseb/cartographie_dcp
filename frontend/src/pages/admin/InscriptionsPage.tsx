import { useState, useCallback } from 'react';
import { UserCheck, Building2, Lock, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { formatDateTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { InscriptionItem } from '@/api/admin.api';

type Statut = 'pending' | 'approved' | 'rejected';

const STATUT_LABEL: Record<Statut, string> = {
  pending: 'En attente',
  approved: 'Validées',
  rejected: 'Rejetées',
};

export default function InscriptionsPage() {
  const [statut, setStatut] = useState<Statut>('pending');

  const fetcher = useCallback(() => adminApi.getInscriptions(statut), [statut]);
  const { data: items, isLoading, error, refetch } = useApi(fetcher, [statut]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl flex items-center gap-3">
          <UserCheck className="w-7 h-7 text-[var(--artci-orange)]" />
          Inscriptions à valider
        </h1>
      </div>

      {/* Tabs statut */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {(Object.keys(STATUT_LABEL) as Statut[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatut(s)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
              statut === s
                ? 'border-[var(--artci-orange)] text-[var(--artci-orange)]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {s === 'pending' && <Clock className="w-4 h-4" />}
            {s === 'approved' && <CheckCircle className="w-4 h-4" />}
            {s === 'rejected' && <XCircle className="w-4 h-4" />}
            {STATUT_LABEL[s]}
          </button>
        ))}
      </div>

      {isLoading && <Loading text="Chargement..." />}
      {error && <ErrorDisplay message={error} onRetry={refetch} />}
      {items && items.length === 0 && (
        <EmptyState title="Aucune inscription" description={`Aucune inscription ${STATUT_LABEL[statut].toLowerCase()}.`} />
      )}

      {items && items.length > 0 && (
        <div className="space-y-3">
          {items.map((it) => (
            <InscriptionCard key={it.id} item={it} onChanged={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}

function InscriptionCard({ item, onChanged }: { item: InscriptionItem; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState<'valider' | 'rejeter' | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [motif, setMotif] = useState('');
  const [error, setError] = useState('');

  async function handleValider() {
    setError('');
    setActing('valider');
    try {
      await adminApi.validerInscription(item.id);
      onChanged();
    } catch {
      setError('Erreur lors de la validation.');
    } finally {
      setActing(null);
    }
  }

  async function handleRejeter() {
    if (!motif.trim()) {
      setError('Le motif est requis.');
      return;
    }
    setError('');
    setActing('rejeter');
    try {
      await adminApi.rejeterInscription(item.id, motif.trim());
      onChanged();
    } catch {
      setError('Erreur lors du rejet.');
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-base">{item.denomination}</h3>
            <span className={cn(
              'badge text-xs',
              item.inscription_statut === 'pending' && 'badge-encours',
              item.inscription_statut === 'approved' && 'badge-conforme',
              item.inscription_statut === 'rejected' && 'badge-encours',
            )}>{item.inscription_statut}</span>
          </div>
          <div className="text-xs text-gray-500">
            CC {item.numero_cc} • {item.email} • {formatDateTime(item.createdAt)}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Section 1 - DG */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[var(--artci-orange)]" /> Représentant légal
            </h4>
            <div className="text-sm text-gray-700 space-y-1">
              <div><strong>{item.dg_prenom} {item.dg_nom}</strong></div>
              {item.dg_fonction && <div className="text-xs text-gray-500">{item.dg_fonction}</div>}
              <div>{item.dg_email ?? '-'}</div>
              {item.dg_telephone && <div className="text-xs">{item.dg_telephone}</div>}
            </div>
          </div>

          {/* Section 2 - DPO */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--artci-green)]" /> DPO
            </h4>
            <div className="text-sm text-gray-700 space-y-1">
              <div><strong>{item.dpo_prenom} {item.dpo_nom}</strong></div>
              <div className="text-xs text-gray-500">{item.dpo_type}{item.dpo_organisme ? ` — ${item.dpo_organisme}` : ''}</div>
              <div>{item.dpo_email ?? '-'}</div>
              {item.dpo_telephone && <div className="text-xs">{item.dpo_telephone}</div>}
            </div>
          </div>

          {/* Section 3 - Acces */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[var(--artci-orange)]" /> Emails d'accès
            </h4>
            <div className="text-sm text-gray-700 space-y-1">
              <div><span className="text-xs text-gray-500">Référant:</span> {item.acces_email_referant ?? '-'}</div>
              <div><span className="text-xs text-gray-500">DPO:</span> {item.acces_email_dpo ?? '-'}</div>
            </div>
          </div>

          {item.inscription_motif_rejet && (
            <div className="lg:col-span-3">
              <div className="alert alert-danger text-sm">
                <strong>Motif du rejet :</strong> {item.inscription_motif_rejet}
              </div>
            </div>
          )}

          {item.inscription_statut === 'pending' && (
            <div className="lg:col-span-3 flex flex-col gap-2 pt-2 border-t border-gray-100">
              {error && <div className="alert alert-danger text-sm">{error}</div>}
              {!rejectMode ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleValider}
                    disabled={acting !== null}
                    className="btn btn-secondary text-sm py-2 px-4 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Valider l'inscription
                  </button>
                  <button
                    onClick={() => setRejectMode(true)}
                    disabled={acting !== null}
                    className="btn btn-outline text-sm py-2 px-4 flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Rejeter
                  </button>
                </div>
              ) : (
                <div>
                  <textarea
                    placeholder="Motif du rejet (visible par l'entreprise)"
                    rows={3}
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    className="w-full mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleRejeter}
                      disabled={acting !== null}
                      className="btn btn-primary text-sm py-2 px-4"
                    >
                      Confirmer le rejet
                    </button>
                    <button
                      onClick={() => { setRejectMode(false); setMotif(''); setError(''); }}
                      className="btn btn-outline text-sm py-2 px-4"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

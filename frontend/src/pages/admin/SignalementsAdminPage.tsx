/**
 * Page Super Admin : traitement des signalements d'erreur emis par les entreprises.
 * Acces restreint super_admin uniquement.
 */
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Eye, MessageCircle, CheckCircle2, X as XIcon } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import type { SignalementErreurAdminItem, StatutSignalement } from '@/api/admin.api';

// Réponses pré-rédigées proposées au Super Admin (liste déroulante des retours)
const REPONSES_TYPES = [
  'Votre signalement a été pris en compte, son traitement est en cours.',
  "Le score de conformité a été recalculé et corrigé suite à votre signalement.",
  'Les informations de votre dossier ont été mises à jour.',
  "Après vérification, l'information signalée est exacte : aucune correction n'est nécessaire.",
  'Signalement non fondé après vérification.',
  "Merci de fournir des éléments complémentaires pour permettre le traitement de votre signalement.",
];

const STATUT_PILLS: { key: StatutSignalement | 'all'; label: string; className: string }[] = [
  { key: 'open', label: 'À traiter', className: 'bg-yellow-100 text-yellow-800' },
  { key: 'in_progress', label: 'En cours', className: 'bg-blue-100 text-blue-800' },
  { key: 'resolved', label: 'Résolus', className: 'bg-green-100 text-green-800' },
  { key: 'dismissed', label: 'Rejetés', className: 'bg-gray-200 text-gray-700' },
  { key: 'all', label: 'Tous', className: 'bg-white text-gray-700' },
];

export default function SignalementsAdminPage() {
  const [filter, setFilter] = useState<StatutSignalement | 'all'>('open');
  const [editing, setEditing] = useState<SignalementErreurAdminItem | null>(null);
  const [reponse, setReponse] = useState('');
  const [decision, setDecision] = useState<StatutSignalement>('in_progress');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const fetcher = useCallback(
    () => adminApi.listSignalements(filter === 'all' ? undefined : filter),
    [filter]
  );
  const { data, isLoading, error, refetch } = useApi(fetcher, [filter]);

  function openEdit(s: SignalementErreurAdminItem) {
    setEditing(s);
    setReponse(s.reponse_admin ?? '');
    setDecision(s.statut === 'open' ? 'in_progress' : s.statut);
  }

  async function handleRespond() {
    if (!editing) return;
    setSaving(true);
    setFeedback(null);
    try {
      await adminApi.repondreSignalement(editing.id, {
        statut: decision,
        reponse_admin: reponse || undefined,
      });
      setFeedback({ type: 'success', msg: 'Signalement mis à jour.' });
      setEditing(null);
      refetch();
    } catch {
      setFeedback({ type: 'error', msg: 'Erreur lors de la mise à jour du signalement.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl mb-1 flex items-center gap-3">
          <AlertTriangle className="w-7 h-7 text-orange-500" />
          Signalements d'erreur entreprise
        </h1>
        <p className="text-sm text-gray-600">
          Réservé aux Super Administrateurs. Examinez et répondez aux signalements émis par les entreprises.
        </p>
      </div>

      {feedback && (
        <div className={`alert mb-4 ${feedback.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
          {feedback.msg}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUT_PILLS.map((p) => {
          const active = filter === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setFilter(p.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? 'bg-[var(--brand-secondary)] text-white border-[var(--brand-secondary)]'
                  : `${p.className} border-transparent hover:opacity-80`
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <Loading fullPage text="Chargement..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={refetch} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Aucun signalement"
          description="Aucun signalement d'erreur ne correspond à ce filtre."
          icon={CheckCircle2}
        />
      ) : (
        <div className="space-y-3">
          {data.items.map((s) => {
            const statutPill = STATUT_PILLS.find((p) => p.key === s.statut);
            return (
              <div key={s.id} className="card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{s.sujet}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <Link to={`/admin/entites/${s.entite_id}`} className="text-[var(--brand-secondary)] hover:underline">
                        {s.entite_denomination ?? s.entite_id}
                      </Link>
                      {s.rubrique_concernee && <span> · {s.rubrique_concernee}</span>}
                      <span> · {s.createdAt ? new Date(s.createdAt).toLocaleString('fr-FR') : '-'}</span>
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap ${statutPill?.className ?? ''}`}>
                    {statutPill?.label ?? s.statut}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{s.description}</p>
                {s.reponse_admin && (
                  <div className="p-2 bg-green-50 border-l-2 border-green-400 mb-3">
                    <p className="text-xs font-semibold text-green-800 mb-0.5">Réponse précédente</p>
                    <p className="text-sm text-green-900 whitespace-pre-wrap">{s.reponse_admin}</p>
                  </div>
                )}
                <div className="flex items-center justify-end gap-2">
                  <Link
                    to={`/admin/entites/${s.entite_id}`}
                    className="btn btn-outline text-xs flex items-center gap-1 px-3 py-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Voir l'entité
                  </Link>
                  {s.statut !== 'resolved' && s.statut !== 'dismissed' && (
                    <button
                      onClick={() => openEdit(s)}
                      className="btn btn-primary text-xs flex items-center gap-1 px-3 py-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Répondre
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de reponse */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="font-bold text-lg">Répondre au signalement</h2>
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-gray-700">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">SIGNALEMENT</p>
                <p className="font-semibold text-sm">{editing.sujet}</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{editing.description}</p>
              </div>

              <div className="form-group">
                <label htmlFor="decision">Décision</label>
                <select
                  id="decision"
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as StatutSignalement)}
                >
                  <option value="in_progress">En cours de traitement</option>
                  <option value="resolved">Résolu</option>
                  <option value="dismissed">Rejeté (signalement non fondé)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="reponse_type">Retour type (optionnel)</label>
                <select
                  id="reponse_type"
                  value=""
                  onChange={(e) => { if (e.target.value) setReponse(e.target.value); }}
                >
                  <option value="">— Choisir un retour pré-rédigé —</option>
                  {REPONSES_TYPES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Sélectionnez un message pré-rédigé pour remplir la réponse, puis ajustez si besoin.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="reponse">Réponse à l'entreprise</label>
                <textarea
                  id="reponse"
                  rows={5}
                  value={reponse}
                  onChange={(e) => setReponse(e.target.value)}
                  placeholder="Expliquez à l'entreprise les actions entreprises ou la raison du rejet..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditing(null)} className="btn btn-outline text-sm">
                  Annuler
                </button>
                <button
                  onClick={handleRespond}
                  disabled={saving}
                  className="btn btn-primary text-sm flex items-center gap-2"
                >
                  {saving ? (
                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Envoyer la réponse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

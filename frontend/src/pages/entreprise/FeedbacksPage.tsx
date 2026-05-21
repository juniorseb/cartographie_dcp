import { MessageSquare, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';
import type { SignalementErreurItem } from '@/api/entreprise.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { formatDateTime } from '@/utils/format';

const SIGNALEMENT_STATUT: Record<SignalementErreurItem['statut'], { label: string; className: string }> = {
  open: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'En cours de traitement', className: 'bg-blue-100 text-blue-800' },
  resolved: { label: 'Résolu', className: 'bg-green-100 text-green-800' },
  dismissed: { label: 'Rejeté', className: 'bg-gray-200 text-gray-700' },
};

export default function FeedbacksPage() {
  const { data: feedbacks, isLoading, error, refetch } = useApi(
    () => entrepriseApi.getFeedbacks(),
    []
  );
  const { data: signalements, isLoading: loadingSig } = useApi(
    () => entrepriseApi.listMesSignalements(),
    []
  );

  if (isLoading || loadingSig) return <Loading fullPage text="Chargement des notifications..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  const hasFeedbacks = feedbacks && feedbacks.length > 0;
  const hasSignalements = signalements && signalements.length > 0;

  if (!hasFeedbacks && !hasSignalements) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl mb-6">Notifications</h1>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6">Notifications</h1>

      {/* Retours de l'ARTCI */}
      {hasFeedbacks && (
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[var(--artci-orange)]" />
            Retours de l'ARTCI
          </h2>
          {feedbacks!.map((fb) => (
            <div key={fb.id} className="card card-orange">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-[var(--artci-orange)] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="badge badge-encours">{fb.type}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(fb.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{fb.message}</p>
                  {fb.created_by_nom && (
                    <p className="text-xs text-gray-400 mt-2">— {fb.created_by_nom}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mes signalements */}
      {hasSignalements && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Mes signalements
          </h2>
          {signalements!.map((s) => {
            const statutInfo = SIGNALEMENT_STATUT[s.statut];
            return (
              <div key={s.id} className="card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-sm">{s.sujet}</h3>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${statutInfo.className}`}>
                    {statutInfo.label}
                  </span>
                </div>
                {s.rubrique_concernee && (
                  <p className="text-xs text-gray-500 mb-2">Rubrique : {s.rubrique_concernee}</p>
                )}
                <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">{s.description}</p>
                <p className="text-xs text-gray-400">
                  Soumis le {s.createdAt ? formatDateTime(s.createdAt) : '-'}
                </p>
                {s.reponse_admin && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-700 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-green-800 mb-1">Réponse de l'ARTCI</p>
                        <p className="text-sm text-green-900 whitespace-pre-wrap">{s.reponse_admin}</p>
                        {s.date_traitement && (
                          <p className="text-xs text-green-700 mt-2">Le {formatDateTime(s.date_traitement)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

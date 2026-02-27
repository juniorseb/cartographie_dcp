import { MessageSquare, Clock } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { formatDateTime } from '@/utils/format';

export default function FeedbacksPage() {
  const { data: feedbacks, isLoading, error, refetch } = useApi(
    () => entrepriseApi.getFeedbacks(),
    []
  );

  if (isLoading) return <Loading fullPage text="Chargement des feedbacks..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;
  if (!feedbacks || feedbacks.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl mb-6">Feedbacks ARTCI</h1>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6">Feedbacks ARTCI</h1>

      <div className="space-y-4">
        {feedbacks.map((fb) => (
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
    </div>
  );
}

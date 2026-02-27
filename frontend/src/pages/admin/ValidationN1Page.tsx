import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Check, X, Eye } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { formatDate } from '@/utils/format';

export default function ValidationN1Page() {
  const { data: queue, isLoading, error, refetch } = useApi(
    () => adminApi.getValidationQueue(),
    []
  );
  const [processing, setProcessing] = useState<string | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  async function handleValidation(id: string, action: 'valider' | 'renvoyer') {
    setProcessing(id);
    try {
      await adminApi.validerN1(id, { action, commentaire: commentaire || undefined });
      setActiveId(null);
      setCommentaire('');
      refetch();
    } catch {
      // erreur silencieuse
    } finally {
      setProcessing(null);
    }
  }

  if (isLoading) return <Loading fullPage text="Chargement..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  return (
    <div>
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <CheckSquare className="w-7 h-7 text-[var(--artci-green)]" />
        Validation N+1
      </h1>

      {!queue || queue.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <div key={item.id} className="card">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.entite_denomination ?? item.entite_id}</p>
                  <p className="text-sm text-gray-500">
                    Agent : {item.agent_prenom} {item.agent_nom} — Traité le{' '}
                    {item.date_traitement ? formatDate(item.date_traitement) : '-'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/admin/entites/${item.entite_id}`}
                    className="btn btn-outline text-sm py-2 px-3 flex items-center gap-1 no-underline"
                  >
                    <Eye className="w-4 h-4" /> Voir
                  </Link>
                  {activeId !== item.id ? (
                    <button
                      className="btn btn-primary text-sm py-2 px-3"
                      onClick={() => setActiveId(item.id)}
                    >
                      Valider / Renvoyer
                    </button>
                  ) : (
                    <button
                      className="btn btn-outline text-sm py-2 px-3"
                      onClick={() => setActiveId(null)}
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </div>

              {activeId === item.id && (
                <div className="mt-4 p-4 bg-gray-50 rounded">
                  <div className="form-group">
                    <label className="text-sm">Commentaire (optionnel)</label>
                    <textarea
                      value={commentaire}
                      onChange={(e) => setCommentaire(e.target.value)}
                      rows={2}
                      placeholder="Commentaire..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-secondary text-sm py-2 px-4 flex items-center gap-1"
                      onClick={() => handleValidation(item.id, 'valider')}
                      disabled={processing === item.id}
                    >
                      <Check className="w-4 h-4" /> Approuver
                    </button>
                    <button
                      className="btn text-sm py-2 px-4 flex items-center gap-1"
                      style={{ backgroundColor: 'var(--status-rejete)', color: 'white' }}
                      onClick={() => handleValidation(item.id, 'renvoyer')}
                      disabled={processing === item.id}
                    >
                      <X className="w-4 h-4" /> Renvoyer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, CheckCircle, Eye, Clock } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { formatDate } from '@/utils/format';

const STATUT_BADGE_MAP: Record<string, string> = {
  en_cours: 'badge badge-encours',
  traite_attente_validation: 'badge badge-achevee',
  valide: 'badge badge-conforme',
  en_retard: 'badge badge-rejete',
};

export default function PanierPage() {
  const { data: panier, isLoading, error, refetch } = useApi(
    () => adminApi.getPanier(),
    []
  );
  const [processing, setProcessing] = useState<string | null>(null);

  async function handleTraiter(id: string) {
    setProcessing(id);
    try {
      await adminApi.traiterAssignation(id);
      refetch();
    } catch {
      // erreur silencieuse
    } finally {
      setProcessing(null);
    }
  }

  if (isLoading) return <Loading fullPage text="Chargement du panier..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  return (
    <div>
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <Inbox className="w-7 h-7 text-[var(--artci-green)]" />
        Mon Panier
      </h1>

      {!panier || panier.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {panier.map((item) => (
            <div key={item.id} className="card">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.entite_denomination ?? item.entite_id}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={STATUT_BADGE_MAP[item.statut] ?? 'badge'}>{item.statut}</span>
                    {item.echeance && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        Échéance : {formatDate(item.echeance)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/admin/entites/${item.entite_id}`}
                    className="btn btn-outline text-sm py-2 px-3 flex items-center gap-1 no-underline"
                  >
                    <Eye className="w-4 h-4" /> Voir
                  </Link>
                  {item.statut === 'en_cours' && (
                    <button
                      className="btn btn-secondary text-sm py-2 px-3 flex items-center gap-1"
                      onClick={() => handleTraiter(item.id)}
                      disabled={processing === item.id}
                    >
                      {processing === item.id ? (
                        <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Traiter
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

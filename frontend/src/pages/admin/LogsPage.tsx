import { useState, useCallback } from 'react';
import { History, ArrowRight } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import Pagination from '@/components/common/Pagination';
import { formatDateTime } from '@/utils/format';
import { ITEMS_PER_PAGE } from '@/utils/constants';

const STATUT_BADGE_MAP: Record<string, string> = {
  brouillon: 'badge',
  soumis: 'badge badge-encours',
  en_verification: 'badge badge-encours',
  en_attente_complements: 'badge badge-achevee',
  conforme: 'badge badge-conforme',
  valide: 'badge badge-conforme',
  rejete: 'badge badge-rejete',
  publie: 'badge badge-conforme',
};

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [entiteFilter, setEntiteFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  const fetchLogs = useCallback(
    () =>
      adminApi.getLogs({
        page,
        per_page: ITEMS_PER_PAGE,
        entite_id: entiteFilter || undefined,
        modifie_par: userFilter || undefined,
      }),
    [page, entiteFilter, userFilter]
  );

  const { data, isLoading, error, refetch } = useApi(fetchLogs, [page, entiteFilter, userFilter]);

  function handleSearch() {
    setPage(1);
    refetch();
  }

  if (isLoading) return <Loading fullPage text="Chargement..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  return (
    <div>
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <History className="w-7 h-7 text-[var(--artci-green)]" />
        Historique des actions
      </h1>

      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="form-group flex-1" style={{ marginBottom: 0 }}>
            <label className="text-sm">ID Entité</label>
            <input
              type="text"
              value={entiteFilter}
              onChange={(e) => setEntiteFilter(e.target.value)}
              placeholder="Filtrer par entité..."
            />
          </div>
          <div className="form-group flex-1" style={{ marginBottom: 0 }}>
            <label className="text-sm">ID Utilisateur</label>
            <input
              type="text"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="Filtrer par utilisateur..."
            />
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary py-2 px-4" onClick={handleSearch}>
              Filtrer
            </button>
          </div>
        </div>
      </div>

      {!data || data.items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((log) => (
              <div key={log.id} className="card">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">
                      {log.entite_denomination ?? log.entite_id}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-sm">
                      {log.ancien_statut && (
                        <span className={STATUT_BADGE_MAP[log.ancien_statut] ?? 'badge'}>
                          {log.ancien_statut}
                        </span>
                      )}
                      {log.ancien_statut && log.nouveau_statut && (
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      {log.nouveau_statut && (
                        <span className={STATUT_BADGE_MAP[log.nouveau_statut] ?? 'badge'}>
                          {log.nouveau_statut}
                        </span>
                      )}
                    </div>
                    {log.commentaire && (
                      <p className="text-sm text-gray-500 mt-1">{log.commentaire}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>{log.modifie_par_nom ?? log.modifie_par ?? '-'}</p>
                    <p>{formatDateTime(log.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={data.pages}
            hasNext={data.has_next}
            hasPrev={data.has_prev}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

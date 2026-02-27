import { useState, useCallback, useMemo } from 'react';
import { Shield, ArrowRight, Activity, TrendingUp } from 'lucide-react';
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

export default function AuditsAdminPage() {
  const [page, setPage] = useState(1);
  const [entiteFilter, setEntiteFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

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

  // Filter by date range client-side (period filter applied after fetch)
  const filteredItems = useMemo(() => {
    if (!data) return [];
    let items = data.items;
    if (dateDebut) {
      const start = new Date(dateDebut);
      items = items.filter((item) => new Date(item.createdAt) >= start);
    }
    if (dateFin) {
      const end = new Date(dateFin);
      end.setHours(23, 59, 59, 999);
      items = items.filter((item) => new Date(item.createdAt) <= end);
    }
    return items;
  }, [data, dateDebut, dateFin]);

  // KPIs
  const totalTransitions = filteredItems.length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTransitions = filteredItems.filter(
    (item) => item.createdAt.slice(0, 10) === todayStr
  ).length;

  function handleSearch() {
    setPage(1);
    refetch();
  }

  function handleReset() {
    setEntiteFilter('');
    setUserFilter('');
    setDateDebut('');
    setDateFin('');
    setPage(1);
  }

  return (
    <div>
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <Shield className="w-7 h-7 text-[var(--artci-green)]" />
        Audit trail
      </h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
        <div className="card card-orange">
          <div className="flex items-center gap-4">
            <Activity className="w-10 h-10" style={{ color: 'var(--artci-orange)' }} />
            <div>
              <p className="text-3xl font-bold">{totalTransitions}</p>
              <p className="text-sm text-gray-500">Total transitions (page courante)</p>
            </div>
          </div>
        </div>
        <div className="card card-green">
          <div className="flex items-center gap-4">
            <TrendingUp className="w-10 h-10" style={{ color: 'var(--artci-green)' }} />
            <div>
              <p className="text-3xl font-bold">{todayTransitions}</p>
              <p className="text-sm text-gray-500">Transitions aujourd'hui</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="text-sm">ID Entite</label>
            <input
              type="text"
              value={entiteFilter}
              onChange={(e) => setEntiteFilter(e.target.value)}
              placeholder="Filtrer par entite..."
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="text-sm">Modifie par</label>
            <input
              type="text"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="Filtrer par utilisateur..."
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="text-sm">Date debut</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="text-sm">Date fin</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <button className="btn btn-primary py-2 px-4" onClick={handleSearch}>
              Filtrer
            </button>
            <button className="btn btn-outline py-2 px-4" onClick={handleReset}>
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <Loading fullPage text="Chargement de l'audit trail..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={refetch} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="Aucune transition"
          description="Aucune transition de statut ne correspond a vos criteres."
        />
      ) : (
        <>
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Entite</th>
                  <th>Transition</th>
                  <th>Modifie par</th>
                  <th>Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((log) => (
                  <tr key={log.id}>
                    <td className="text-sm text-gray-500 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="font-semibold text-sm">
                      {log.entite_denomination ?? log.entite_id}
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-sm">
                        {log.ancien_statut ? (
                          <span className={STATUT_BADGE_MAP[log.ancien_statut] ?? 'badge'}>
                            {log.ancien_statut}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                        {log.ancien_statut && log.nouveau_statut && (
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        {log.nouveau_statut ? (
                          <span className={STATUT_BADGE_MAP[log.nouveau_statut] ?? 'badge'}>
                            {log.nouveau_statut}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="text-sm">{log.modifie_par_nom ?? log.modifie_par ?? '-'}</td>
                    <td className="text-sm text-gray-500">{log.commentaire ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && (
            <Pagination
              page={data.page}
              totalPages={data.pages}
              hasNext={data.has_next}
              hasPrev={data.has_prev}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

import { useState, useCallback } from 'react';
import { RefreshCw, Check, X } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import SearchBar from '@/components/common/SearchBar';
import { formatDate } from '@/utils/format';
import { ITEMS_PER_PAGE } from '@/utils/constants';

const STATUT_BADGE: Record<string, string> = {
  en_attente: 'px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700',
  en_cours: 'px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700',
  approuve: 'px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700',
  rejete: 'px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700',
};

function getJoursRestants(dateExpiration: string): number {
  const now = new Date();
  const expiration = new Date(dateExpiration);
  const diff = expiration.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getJoursBadgeBg(jours: number): string {
  if (jours > 90) return 'bg-green-100 text-green-700';
  if (jours >= 30) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}

export default function RenouvellementAdminPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRenouvellements = useCallback(
    () =>
      adminApi.getRenouvellements({
        page,
        per_page: ITEMS_PER_PAGE,
        search: search || undefined,
        statut: statutFilter || undefined,
      }),
    [page, search, statutFilter]
  );

  const { data, isLoading, error, refetch } = useApi(fetchRenouvellements, [page, search, statutFilter]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatutChange(value: string) {
    setStatutFilter(value);
    setPage(1);
  }

  async function handleApprouver(id: string) {
    setProcessing(id);
    try {
      await adminApi.traiterRenouvellement(id, { action: 'approuver' });
      refetch();
    } catch {
      // erreur silencieuse
    } finally {
      setProcessing(null);
    }
  }

  async function handleRejeter(id: string) {
    const commentaire = window.prompt('Commentaire du rejet :');
    if (!commentaire) return;
    setProcessing(id);
    try {
      await adminApi.traiterRenouvellement(id, { action: 'rejeter', commentaire });
      refetch();
    } catch {
      // erreur silencieuse
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <RefreshCw className="w-7 h-7 text-[var(--artci-green)]" />
        Renouvellements
      </h1>

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <SearchBar value={search} onChange={handleSearch} placeholder="Rechercher entreprise..." />
        <div className="form-group mb-0">
          <select
            value={statutFilter}
            onChange={(e) => handleStatutChange(e.target.value)}
            className="w-full py-2.5"
          >
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="en_cours">En cours</option>
            <option value="approuve">Approuve</option>
            <option value="rejete">Rejete</option>
          </select>
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <Loading fullPage text="Chargement des renouvellements..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={refetch} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Aucun renouvellement"
          description="Aucune demande de renouvellement ne correspond a vos criteres."
        />
      ) : (
        <>
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>Date expiration agrement</th>
                  <th>Jours restants</th>
                  <th>Statut demande</th>
                  <th>Motif</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => {
                  const jours = getJoursRestants(item.date_expiration);
                  return (
                    <tr key={item.id}>
                      <td className="font-semibold">{item.entreprise_denomination}</td>
                      <td className="text-sm">{formatDate(item.date_expiration)}</td>
                      <td>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${getJoursBadgeBg(jours)}`}
                        >
                          {jours} jour{jours !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td>
                        <span className={STATUT_BADGE[item.statut] ?? 'badge'}>
                          {item.statut}
                        </span>
                      </td>
                      <td className="text-sm text-gray-500">{item.motif ?? '-'}</td>
                      <td>
                        {item.statut === 'en_attente' || item.statut === 'en_cours' ? (
                          <div className="flex gap-2">
                            <button
                              className="btn text-sm py-1.5 px-3 flex items-center gap-1"
                              style={{ backgroundColor: 'var(--artci-green)', color: 'white' }}
                              onClick={() => handleApprouver(item.id)}
                              disabled={processing === item.id}
                            >
                              <Check className="w-4 h-4" /> Approuver
                            </button>
                            <button
                              className="btn text-sm py-1.5 px-3 flex items-center gap-1"
                              style={{ backgroundColor: 'var(--status-rejete)', color: 'white' }}
                              onClick={() => handleRejeter(item.id)}
                              disabled={processing === item.id}
                            >
                              <X className="w-4 h-4" /> Rejeter
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={data.page}
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

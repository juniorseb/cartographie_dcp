import { useState, useCallback } from 'react';
import { FileCheck, Check, X } from 'lucide-react';
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
  valide: 'px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700',
  rejete: 'px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700',
};

export default function ValidationRapportsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRapports = useCallback(
    () =>
      adminApi.getRapportsActivite({
        page,
        per_page: ITEMS_PER_PAGE,
        search: search || undefined,
        statut: statutFilter || undefined,
      }),
    [page, search, statutFilter]
  );

  const { data, isLoading, error, refetch } = useApi(fetchRapports, [page, search, statutFilter]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatutChange(value: string) {
    setStatutFilter(value);
    setPage(1);
  }

  async function handleValider(id: string) {
    setProcessing(id);
    try {
      await adminApi.traiterRapport(id, { action: 'valider' });
      refetch();
    } catch {
      // erreur silencieuse
    } finally {
      setProcessing(null);
    }
  }

  async function handleRejeter(id: string) {
    const motif = window.prompt('Motif du rejet :');
    if (!motif) return;
    setProcessing(id);
    try {
      await adminApi.traiterRapport(id, { action: 'rejeter', motif });
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
        <FileCheck className="w-7 h-7 text-[var(--artci-green)]" />
        Validation des rapports d'activite
      </h1>

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <SearchBar value={search} onChange={handleSearch} placeholder="Rechercher entreprise, fichier..." />
        <div className="form-group mb-0">
          <select
            value={statutFilter}
            onChange={(e) => handleStatutChange(e.target.value)}
            className="w-full py-2.5"
          >
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="valide">Valide</option>
            <option value="rejete">Rejete</option>
          </select>
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <Loading fullPage text="Chargement des rapports..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={refetch} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Aucun rapport"
          description="Aucun rapport d'activite ne correspond a vos criteres."
        />
      ) : (
        <>
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>Type document</th>
                  <th>Nom fichier</th>
                  <th>Date soumission</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((rapport) => (
                  <tr key={rapport.id}>
                    <td className="font-semibold">{rapport.entreprise_denomination}</td>
                    <td className="text-sm">{rapport.type_document ?? '-'}</td>
                    <td className="text-sm">{rapport.nom_fichier}</td>
                    <td className="text-sm">{formatDate(rapport.date_soumission)}</td>
                    <td>
                      <span className={STATUT_BADGE[rapport.statut] ?? 'badge'}>
                        {rapport.statut}
                      </span>
                    </td>
                    <td>
                      {rapport.statut === 'en_attente' ? (
                        <div className="flex gap-2">
                          <button
                            className="btn text-sm py-1.5 px-3 flex items-center gap-1"
                            style={{ backgroundColor: 'var(--artci-green)', color: 'white' }}
                            onClick={() => handleValider(rapport.id)}
                            disabled={processing === rapport.id}
                          >
                            <Check className="w-4 h-4" /> Valider
                          </button>
                          <button
                            className="btn text-sm py-1.5 px-3 flex items-center gap-1"
                            style={{ backgroundColor: 'var(--status-rejete)', color: 'white' }}
                            onClick={() => handleRejeter(rapport.id)}
                            disabled={processing === rapport.id}
                          >
                            <X className="w-4 h-4" /> Rejeter
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
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

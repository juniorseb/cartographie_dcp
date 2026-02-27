import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Eye, UserCheck } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import SearchBar from '@/components/common/SearchBar';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { formatDate } from '@/utils/format';
import { ROUTES, ITEMS_PER_PAGE } from '@/utils/constants';
import type { AdminEntiteFilter } from '@/types/admin';

export default function DemandesAutoPage() {
  const [filters, setFilters] = useState<AdminEntiteFilter>({
    origine_saisie: 'auto_recensement',
  });
  const [page, setPage] = useState(1);
  const [statutWorkflow, setStatutWorkflow] = useState('');

  const fetchEntites = useCallback(
    () =>
      adminApi.getEntites({
        ...filters,
        origine_saisie: 'auto_recensement',
        statut_workflow: statutWorkflow || undefined,
        page,
        per_page: ITEMS_PER_PAGE,
      }),
    [filters, statutWorkflow, page]
  );

  const { data, isLoading, error, refetch } = useApi(fetchEntites, [filters, statutWorkflow, page]);

  function updateFilter(key: keyof AdminEntiteFilter, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  }

  function handleStatutChange(value: string) {
    setStatutWorkflow(value);
    setPage(1);
  }

  return (
    <div>
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <ClipboardList className="w-7 h-7 text-[var(--artci-orange)]" />
        Demandes auto-recensement
      </h1>

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SearchBar
          value={filters.search ?? ''}
          onChange={(v) => updateFilter('search', v)}
          placeholder="Rechercher denomination, n° CC..."
        />
        <div className="form-group mb-0">
          <select
            value={statutWorkflow}
            onChange={(e) => handleStatutChange(e.target.value)}
            className="w-full py-2.5"
          >
            <option value="">Tous les statuts</option>
            <option value="soumis">Soumis</option>
            <option value="en_verification">En verification</option>
          </select>
        </div>
        <div className="form-group mb-0">
          <select
            value={filters.secteur_activite ?? ''}
            onChange={(e) => updateFilter('secteur_activite', e.target.value)}
            className="w-full py-2.5"
          >
            <option value="">Tous les secteurs</option>
            <option value="Telecommunications">Telecommunications</option>
            <option value="Banque / Finance">Banque / Finance</option>
            <option value="Assurance">Assurance</option>
            <option value="Sante">Sante</option>
            <option value="Education">Education</option>
            <option value="Commerce">Commerce</option>
            <option value="Industrie">Industrie</option>
            <option value="Services">Services</option>
            <option value="Transport">Transport</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
        <div className="form-group mb-0">
          <select
            value={filters.ville ?? ''}
            onChange={(e) => updateFilter('ville', e.target.value)}
            className="w-full py-2.5"
          >
            <option value="">Toutes les villes</option>
            <option value="Abidjan">Abidjan</option>
            <option value="Bouake">Bouake</option>
            <option value="Yamoussoukro">Yamoussoukro</option>
            <option value="San-Pedro">San-Pedro</option>
            <option value="Daloa">Daloa</option>
            <option value="Korhogo">Korhogo</option>
          </select>
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <Loading fullPage text="Chargement des demandes auto-recensement..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={refetch} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Aucune demande"
          description="Aucune demande d'auto-recensement ne correspond a vos criteres."
        />
      ) : (
        <>
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Denomination</th>
                  <th>N° CC</th>
                  <th>Secteur</th>
                  <th>Ville</th>
                  <th>Workflow</th>
                  <th>Date creation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entite) => (
                  <tr key={entite.id}>
                    <td className="font-semibold">{entite.denomination}</td>
                    <td className="text-sm">{entite.numero_cc}</td>
                    <td className="text-sm">{entite.secteur_activite ?? '-'}</td>
                    <td className="text-sm">{entite.ville ?? '-'}</td>
                    <td className="text-xs">
                      <span className="badge badge-encours">{entite.statut_workflow ?? '-'}</span>
                    </td>
                    <td className="text-sm">{formatDate(entite.createdAt)}</td>
                    <td>
                      <div className="flex gap-2">
                        <Link
                          to={`/admin/entites/${entite.id}`}
                          className="text-[var(--artci-green)] hover:underline flex items-center gap-1 no-underline"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-sm">Voir</span>
                        </Link>
                        <Link
                          to={ROUTES.ADMIN_ASSIGNATION}
                          className="text-[var(--artci-orange)] hover:underline flex items-center gap-1 no-underline"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span className="text-sm">Assigner</span>
                        </Link>
                      </div>
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

import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Plus } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import SearchBar from '@/components/common/SearchBar';
import Pagination from '@/components/common/Pagination';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import { hasMinRole } from '@/components/admin/AdminSidebar';
import { ROUTES, ITEMS_PER_PAGE } from '@/utils/constants';
import type { AdminEntiteFilter } from '@/types/admin';
import type { StatutConformite } from '@/types/enums';

export default function EntitesAdminPage() {
  const { user } = useAuth();
  const canCreate = user && hasMinRole(user.role, 'editor');

  const [filters, setFilters] = useState<AdminEntiteFilter>({});
  const [page, setPage] = useState(1);

  const fetchEntites = useCallback(
    () => adminApi.getEntites({ ...filters, page, per_page: ITEMS_PER_PAGE }),
    [filters, page]
  );
  const { data, isLoading, error, refetch } = useApi(fetchEntites, [filters, page]);

  function updateFilter(key: keyof AdminEntiteFilter, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl">Gestion des Entités</h1>
        {canCreate && (
          <Link to={ROUTES.ADMIN_ENTITE_CREATE} className="btn btn-primary flex items-center gap-2 text-sm no-underline">
            <Plus className="w-4 h-4" /> Nouvelle Entité
          </Link>
        )}
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SearchBar value={filters.search ?? ''} onChange={(v) => updateFilter('search', v)} placeholder="Rechercher..." />
        <div className="form-group mb-0">
          <select value={filters.statut_workflow ?? ''} onChange={(e) => updateFilter('statut_workflow', e.target.value)} className="w-full py-2.5">
            <option value="">Tous les statuts workflow</option>
            <option value="brouillon">Brouillon</option>
            <option value="soumis">Soumis</option>
            <option value="en_verification">En vérification</option>
            <option value="en_attente_complements">En attente compléments</option>
            <option value="conforme">Conforme</option>
            <option value="valide">Validé</option>
            <option value="rejete">Rejeté</option>
            <option value="publie">Publié</option>
          </select>
        </div>
        <div className="form-group mb-0">
          <select value={filters.secteur_activite ?? ''} onChange={(e) => updateFilter('secteur_activite', e.target.value)} className="w-full py-2.5">
            <option value="">Tous les secteurs</option>
            <option value="Télécommunications">Télécommunications</option>
            <option value="Banque / Finance">Banque / Finance</option>
            <option value="Assurance">Assurance</option>
            <option value="Santé">Santé</option>
            <option value="Éducation">Éducation</option>
            <option value="Commerce">Commerce</option>
            <option value="Industrie">Industrie</option>
            <option value="Services">Services</option>
            <option value="Transport">Transport</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
        <div className="form-group mb-0">
          <select value={filters.origine_saisie ?? ''} onChange={(e) => updateFilter('origine_saisie', e.target.value)} className="w-full py-2.5">
            <option value="">Toutes origines</option>
            <option value="auto_recensement">Auto-recensement</option>
            <option value="saisie_artci">Saisie ARTCI</option>
            <option value="rapprochement">Rapprochement</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <Loading fullPage text="Chargement des entités..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={refetch} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Dénomination</th>
                  <th>N° CC</th>
                  <th>Secteur</th>
                  <th>Ville</th>
                  <th>Origine</th>
                  <th>Workflow</th>
                  <th>Conformité</th>
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
                      <span className="badge badge-encours">{entite.origine_saisie ?? '-'}</span>
                    </td>
                    <td className="text-xs">
                      <span className="badge badge-achevee">{entite.statut_workflow ?? '-'}</span>
                    </td>
                    <td>
                      {entite.statut_conformite ? (
                        <StatusBadge statut={entite.statut_conformite as StatutConformite} />
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td>
                      <Link
                        to={`/admin/entites/${entite.id}`}
                        className="text-[var(--artci-green)] hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="text-sm">Voir</span>
                      </Link>
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

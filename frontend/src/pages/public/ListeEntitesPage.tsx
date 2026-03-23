import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Eye, MapPin, Phone, Mail, User, Download } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as publicApi from '@/api/public.api';
import SearchBar from '@/components/common/SearchBar';
import Pagination from '@/components/common/Pagination';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import ExportButton from '@/components/common/ExportButton';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { ITEMS_PER_PAGE } from '@/utils/constants';
import type { EntiteFilter } from '@/types/entite';

export default function ListeEntitesPage() {
  const [filters, setFilters] = useState<EntiteFilter>({});
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const fetchEntites = useCallback(
    () => publicApi.getEntites({ ...filters, page, per_page: ITEMS_PER_PAGE }),
    [filters, page]
  );
  const { data, isLoading, error, refetch } = useApi(fetchEntites, [filters, page]);

  function updateFilter(key: keyof EntiteFilter, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  }

  async function handleExport(format: 'excel' | 'csv' | 'pdf') {
    setExporting(true);
    try {
      await publicApi.exportEntites(format, filters);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl">Liste des Entités Conformes</h1>
        <ExportButton onExport={handleExport} isLoading={exporting} />
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <SearchBar
          value={filters.search ?? ''}
          onChange={(v) => updateFilter('search', v)}
          placeholder="Rechercher..."
        />
        <div className="form-group mb-0">
          <select
            value={filters.secteur_activite ?? ''}
            onChange={(e) => updateFilter('secteur_activite', e.target.value)}
            className="w-full py-2.5"
          >
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
          <input
            type="text"
            placeholder="Ville"
            value={filters.ville ?? ''}
            onChange={(e) => updateFilter('ville', e.target.value)}
            className="w-full py-2.5"
          />
        </div>
        <div className="form-group mb-0">
          <input
            type="text"
            placeholder="Région"
            value={filters.region ?? ''}
            onChange={(e) => updateFilter('region', e.target.value)}
            className="w-full py-2.5"
          />
        </div>
        <div className="form-group mb-0">
          <select
            value={filters.volume_donnees ?? ''}
            onChange={(e) => updateFilter('volume_donnees', e.target.value)}
            className="w-full py-2.5"
          >
            <option value="">Volume de données</option>
            <option value="< 10 000">{'< 10 000'}</option>
            <option value="10 000-100 000">10 000 - 100 000</option>
            <option value="100 000-500 000">100 000 - 500 000</option>
            <option value="500 000-1 million">500 000 - 1 million</option>
            <option value="1-5 millions">1 - 5 millions</option>
            <option value="5-10 millions">5 - 10 millions</option>
            <option value="10 millions+">10 millions+</option>
          </select>
        </div>
      </div>

      {/* Indicateur scroll mobile */}
      <p className="text-xs text-gray-400 mb-2 md:hidden flex items-center gap-1">
        <span>&larr;</span> Glissez horizontalement pour voir toutes les colonnes <span>&rarr;</span>
      </p>

      {/* Table */}
      {isLoading ? (
        <Loading fullPage text="Chargement des entités..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={refetch} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="table-container overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr>
                  <th className="whitespace-nowrap">Dénomination</th>
                  <th className="whitespace-nowrap">Forme juridique</th>
                  <th className="whitespace-nowrap">Secteur</th>
                  <th className="whitespace-nowrap">Ville</th>
                  <th className="whitespace-nowrap">Géo</th>
                  <th className="whitespace-nowrap">Finalité principale</th>
                  <th className="whitespace-nowrap">CPD (DPO)</th>
                  <th className="whitespace-nowrap">Coordonnées DPO</th>
                  <th className="whitespace-nowrap">Autorisation</th>
                  <th className="whitespace-nowrap">Statut</th>
                  <th className="whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entite) => (
                  <tr key={entite.id}>
                    <td className="font-semibold whitespace-nowrap">{entite.denomination}</td>
                    <td className="text-sm whitespace-nowrap">{entite.forme_juridique ?? '-'}</td>
                    <td className="text-sm whitespace-nowrap">{entite.secteur_activite ?? '-'}</td>
                    <td className="text-sm whitespace-nowrap">{entite.ville ?? '-'}</td>
                    <td>
                      {entite.latitude && entite.longitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${entite.latitude},${entite.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--artci-orange)] hover:underline"
                          title="Voir sur Google Maps"
                        >
                          <MapPin className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="text-sm max-w-[150px] truncate">
                      {entite.finalite_principale ?? '-'}
                    </td>
                    {/* CPD (DPO) */}
                    <td className="text-sm">
                      {entite.a_dpo ? (
                        <span className="text-[var(--artci-green)] font-semibold">Oui</span>
                      ) : (
                        <span className="text-gray-400">Non</span>
                      )}
                    </td>
                    {/* Coordonnées DPO */}
                    <td className="text-sm">
                      {entite.a_dpo && (entite.dpo_nom || entite.dpo_email || entite.dpo_telephone) ? (
                        <div className="space-y-1 min-w-[180px]">
                          {entite.dpo_nom && (
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{entite.dpo_nom}</span>
                            </div>
                          )}
                          {entite.dpo_email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <a
                                href={`mailto:${entite.dpo_email}`}
                                className="text-[var(--artci-orange)] hover:underline truncate"
                              >
                                {entite.dpo_email}
                              </a>
                            </div>
                          )}
                          {entite.dpo_telephone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <a
                                href={`tel:${entite.dpo_telephone}`}
                                className="text-[var(--artci-orange)] hover:underline"
                              >
                                {entite.dpo_telephone}
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    {/* Autorisation */}
                    <td className="text-sm">
                      {entite.numero_autorisation ? (
                        <div className="space-y-1">
                          <span className="whitespace-nowrap">{entite.numero_autorisation}</span>
                          {entite.autorisation_pdf_url && (
                            <a
                              href={`${import.meta.env.VITE_API_URL || '/api'}${entite.autorisation_pdf_url.replace('/api', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[var(--artci-orange)] hover:underline text-xs font-semibold"
                              title="Télécharger l'autorisation PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                              PDF
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge statut={entite.statut_conformite} />
                    </td>
                    <td>
                      <Link
                        to={`/entites/${entite.id}`}
                        className="text-[var(--artci-orange)] hover:underline flex items-center gap-1 whitespace-nowrap"
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

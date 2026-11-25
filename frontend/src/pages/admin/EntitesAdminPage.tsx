import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Plus, Database, CheckCircle2, Layers } from 'lucide-react';
import { cn } from '@/utils/cn';
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

const STATUT_WF_LABELS: Record<string, string> = {
  brouillon: 'Brouillon (entreprise)',
  brouillon_artci: 'Brouillon ARTCI',
  soumis: 'Soumis',
  en_verification: 'En vérification',
  en_attente_complements: 'Compléments demandés',
  conforme_sous_reserve: 'Conforme sous réserve',
  valide: 'Validé',
  rejete: 'Rejeté',
  publie: 'Publié',
};

export default function EntitesAdminPage() {
  const { user } = useAuth();
  const canCreate = user && hasMinRole(user.role, 'editor');

  const [filters, setFilters] = useState<AdminEntiteFilter>({});
  const [page, setPage] = useState(1);
  // Onglet « validees » (defaut) : entites validees par admin/super-admin.
  // Onglet « toutes » : inclut les brouillons (ex. recensement importe) pour
  // pouvoir les ouvrir et les traiter. Cote serveur, un editeur ne recoit
  // jamais les brouillons (scope force par le role).
  const [vue, setVue] = useState<'validees' | 'toutes'>('validees');

  const fetchEntites = useCallback(
    () => adminApi.getEntites({
      ...filters,
      ...(vue === 'validees' ? { validees: true } : {}),
      page,
      per_page: ITEMS_PER_PAGE,
    }),
    [filters, page, vue]
  );
  const { data, isLoading, error, refetch } = useApi(fetchEntites, [filters, page, vue]);

  function changerVue(v: 'validees' | 'toutes') {
    setVue(v);
    setFilters((prev) => ({ ...prev, statut_workflow: undefined }));
    setPage(1);
  }

  function updateFilter(key: keyof AdminEntiteFilter, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-[28px]">Gestion des entités</h1>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            {vue === 'validees'
              ? 'Entités validées par l’ARTCI (conformes sous réserve, validées ou publiées).'
              : 'Toutes les entités, y compris les brouillons du recensement à traiter.'}
          </p>
        </div>
        {canCreate && (
          <Link to={ROUTES.ADMIN_ENTITE_CREATE} className="btn btn-primary flex items-center gap-2 text-sm no-underline">
            <Plus className="w-4 h-4" /> Nouvelle Entité
          </Link>
        )}
      </div>

      {/* Onglets de vue */}
      <div className="mb-5 inline-flex rounded-xl border border-[var(--brand-gray)] bg-white p-1 shadow-sm">
        {([
          { key: 'validees', label: 'Validées', icon: CheckCircle2 },
          { key: 'toutes', label: 'Toutes (brouillons inclus)', icon: Layers },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => changerVue(key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
              vue === key ? 'bg-[var(--brand-primary)] text-white' : 'text-gray-600 hover:bg-[var(--brand-primary-soft)]'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Filtres — un filtre pour chaque colonne pertinente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 [&_input]:h-11 [&_select]:h-11">
        <SearchBar value={filters.search ?? ''} onChange={(v) => updateFilter('search', v)} placeholder="Rechercher (dénomination, N° CC, email...)" />
        <div className="form-group mb-0">
          <select value={filters.forme_juridique ?? ''} onChange={(e) => updateFilter('forme_juridique', e.target.value)} className="w-full py-2.5">
            <option value="">Toutes formes juridiques</option>
            <option value="Société Anonyme (SA)">Société Anonyme (SA)</option>
            <option value="SARL">SARL</option>
            <option value="SASU">SASU</option>
            <option value="Entreprise Individuelle">Entreprise Individuelle</option>
            <option value="Administration publique">Administration publique</option>
            <option value="Établissement public">Établissement public</option>
            <option value="Association">Association</option>
            <option value="Coopérative">Coopérative</option>
            <option value="Autre">Autre</option>
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
          <input
            type="text"
            placeholder="Ville (ex : Abidjan)"
            value={filters.ville ?? ''}
            onChange={(e) => updateFilter('ville', e.target.value)}
            className="w-full py-2.5"
          />
        </div>
        <div className="form-group mb-0">
          <input
            type="text"
            placeholder="Région (ex : Vallée du Bandama)"
            value={filters.region ?? ''}
            onChange={(e) => updateFilter('region', e.target.value)}
            className="w-full py-2.5"
          />
        </div>
        <div className="form-group mb-0">
          <select value={filters.origine_saisie ?? ''} onChange={(e) => updateFilter('origine_saisie', e.target.value)} className="w-full py-2.5">
            <option value="">Toutes origines</option>
            <option value="auto_recensement">Auto-recensement</option>
            <option value="saisie_artci">Saisie ARTCI</option>
          </select>
        </div>
        <div className="form-group mb-0">
          <select value={filters.statut_workflow ?? ''} onChange={(e) => updateFilter('statut_workflow', e.target.value)} className="w-full py-2.5">
            <option value="">{vue === 'validees' ? 'Tous les statuts (validés)' : 'Tous les statuts'}</option>
            {vue === 'toutes' && (
              <>
                <option value="brouillon_artci">Brouillon (saisie ARTCI)</option>
                <option value="brouillon">Brouillon (entreprise)</option>
                <option value="soumis">Soumis</option>
                <option value="en_verification">En vérification</option>
                <option value="en_attente_complements">En attente de compléments</option>
                <option value="rejete">Rejeté</option>
              </>
            )}
            <option value="conforme_sous_reserve">Conforme sous réserve</option>
            <option value="valide">Validé</option>
            <option value="publie">Publié</option>
          </select>
        </div>
        <div className="form-group mb-0">
          <select value={filters.statut_conformite ?? ''} onChange={(e) => updateFilter('statut_conformite', e.target.value)} className="w-full py-2.5">
            <option value="">Toutes conformités</option>
            <option value="Conforme">Conforme (100)</option>
            <option value="Partiellement conforme">Partiellement (70-99)</option>
            <option value="Non conforme">Non conforme (0-69)</option>
          </select>
        </div>
        <div className="form-group mb-0">
          <select
            value={filters.publie_sur_carte === undefined ? '' : String(filters.publie_sur_carte)}
            onChange={(e) => {
              const v = e.target.value;
              setFilters((prev) => ({ ...prev, publie_sur_carte: v === '' ? undefined : v === 'true' }));
              setPage(1);
            }}
            className="w-full py-2.5"
          >
            <option value="">Publication (toutes)</option>
            <option value="true">Publiées sur la carte</option>
            <option value="false">Non publiées</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <Loading fullPage text="Chargement des entités..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={refetch} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={Database}
          title={Object.values(filters).some(Boolean) ? 'Aucune entité ne correspond aux filtres' : vue === 'validees' ? 'Aucune entité validée pour le moment' : 'Aucune entité'}
          description={vue === 'validees'
            ? "Cet onglet ne contient que les entités validées. Les brouillons du recensement sont dans l'onglet « Toutes (brouillons inclus) »."
            : 'Aucune entité ne correspond à ces critères.'}
          action={vue === 'validees' && !Object.values(filters).some(Boolean) ? (
            <button type="button" onClick={() => changerVue('toutes')} className="btn btn-outline text-sm">
              <Layers className="w-4 h-4" />
              Voir toutes les entités
            </button>
          ) : undefined}
        />
      ) : (
        <>
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Dénomination</th>
                  <th>N° CC</th>
                  <th>Forme juridique</th>
                  <th>Secteur</th>
                  <th>Ville</th>
                  <th>Origine</th>
                  <th>Workflow</th>
                  <th>Conformité</th>
                  <th>Score</th>
                  <th>Publication</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entite) => (
                  <tr key={entite.id}>
                    <td className="font-semibold">{entite.denomination}</td>
                    <td className="text-sm">{entite.numero_cc}</td>
                    <td className="text-sm">{entite.forme_juridique ?? '-'}</td>
                    <td className="text-sm">{entite.secteur_activite ?? '-'}</td>
                    <td className="text-sm">{entite.ville ?? '-'}</td>
                    <td className="text-xs">
                      <span className="badge badge-encours">{entite.origine_saisie ?? '-'}</span>
                    </td>
                    <td className="text-xs">
                      <span className="badge bg-[var(--brand-primary-soft)] text-[var(--brand-primary-hover)] whitespace-nowrap">{(entite.statut_workflow && STATUT_WF_LABELS[entite.statut_workflow]) || entite.statut_workflow || '-'}</span>
                    </td>
                    <td>
                      {entite.statut_conformite ? (
                        <StatusBadge statut={entite.statut_conformite as StatutConformite} />
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="text-sm font-semibold">
                      {entite.score_conformite != null ? `${entite.score_conformite}/100` : '-'}
                    </td>
                    <td className="text-xs">
                      {entite.publie_sur_carte ? (
                        <span className="badge badge-conforme">Publiée</span>
                      ) : (
                        <span className="badge badge-encours">Non publiée</span>
                      )}
                    </td>
                    <td>
                      <Link
                        to={`/admin/entites/${entite.id}`}
                        className="text-[var(--brand-secondary)] hover:underline flex items-center gap-1"
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

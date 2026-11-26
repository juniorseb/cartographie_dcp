import { useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, MapPin, Phone, Mail, User, Download, Building2, RotateCcw, Map as MapIcon, BadgeCheck, Users } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useApi } from '@/hooks/useApi';
import * as publicApi from '@/api/public.api';
import SearchBar from '@/components/common/SearchBar';
import Pagination from '@/components/common/Pagination';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import ExportButton from '@/components/common/ExportButton';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import PageHeader from '@/components/common/PageHeader';
import { ROUTES } from '@/utils/constants';
import type { EntiteFilter } from '@/types/entite';

// Pagination dediee a la liste publique (10 par page).
const PER_PAGE_PUBLIC_LIST = 10;

/** Statuts de l'onglet « Organismes conformes » (anciens libelles inclus). */
const STATUTS_CONFORMES = 'Conforme,Partiellement conforme,Démarche achevée,Démarche en cours';

export default function ListeEntitesPage() {
  // ?search=... : recherche lancee depuis la page d'accueil ("Verifier la conformite")
  const [searchParams, setSearchParams] = useSearchParams();
  // Deux vues du registre public :
  //  - « conformes »    : Conforme + Partiellement conforme (anciens libelles inclus)
  //  - « responsables » : toute la base des responsables de traitement recenses
  //    (registre=tous), informations d'identification seulement, SANS statut :
  //    les statuts ne concernent que l'onglet « Organismes conformes ».
  const vue: 'conformes' | 'responsables' = searchParams.get('vue') === 'responsables' ? 'responsables' : 'conformes';
  const [filters, setFilters] = useState<EntiteFilter>(() => {
    const q = searchParams.get('search');
    return q ? { search: q } : {};
  });
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const statutParam = vue === 'conformes' ? STATUTS_CONFORMES : undefined;

  const registre = vue === 'responsables' ? ('tous' as const) : undefined;

  const fetchEntites = useCallback(
    () => publicApi.getEntites({ ...filters, registre, statut_conformite: statutParam, page, per_page: PER_PAGE_PUBLIC_LIST }),
    [filters, page, statutParam, registre]
  );
  const { data, isLoading, error, refetch } = useApi(fetchEntites, [filters, page, statutParam, registre]);

  function changerVue(v: 'conformes' | 'responsables') {
    const next = new URLSearchParams(searchParams);
    if (v === 'responsables') next.set('vue', 'responsables'); else next.delete('vue');
    setSearchParams(next, { replace: true });
    setFilters((prev) => ({ ...prev, statut_conformite: undefined }));
    setPage(1);
  }

  // Stats publiques : leurs cles par_secteur / par_region / par_ville donnent
  // les valeurs reellement presentes en base (filtrees aux entites publiables
  // visibles sur la carte). Plus de listes hardcodees qui derivent du reel.
  // Deux univers : organismes publies (vue conformes) et base complete (vue responsables).
  const { data: statsPublies } = useApi(() => publicApi.getStats(), []);
  const { data: statsBase } = useApi(() => publicApi.getStats({ registre: 'tous' }), []);
  const stats = vue === 'responsables' ? statsBase : statsPublies;
  const secteurs = Object.keys(stats?.par_secteur ?? {}).sort();
  const regions = Object.keys(stats?.par_region ?? {}).sort();
  const villes = Object.keys(stats?.par_ville ?? {}).sort();
  const nbConformes = (statsPublies?.total_entites_conformes ?? 0) + (statsPublies?.total_partiellement_conformes ?? 0);
  const nbTotal = statsBase?.total_recenses ?? 0;

  function updateFilter(key: keyof EntiteFilter, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  }

  async function handleExport(format: 'excel' | 'csv' | 'pdf') {
    setExporting(true);
    try {
      await publicApi.exportEntites(format, { ...filters, registre, statut_conformite: statutParam });
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
    <PageHeader
      variant="band"
      icon={Building2}
      eyebrow="Registre public"
      title={vue === 'conformes' ? 'Organismes conformes' : 'Responsables de traitement'}
      description={vue === 'conformes'
        ? "Organismes jugés conformes ou partiellement conformes par l'ARTCI au titre de la loi n°2013-450."
        : "Ensemble des responsables de traitement recensés par l'ARTCI."}
      actions={
        <>
          <Link to={ROUTES.MAP} className="btn btn-outline py-2 px-4 text-sm">
            <MapIcon className="w-4 h-4" />
            Voir sur la carte
          </Link>
          <ExportButton onExport={handleExport} isLoading={exporting} />
        </>
      }
    />
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
      {/* Onglets du registre */}
      <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
        {([
          { key: 'conformes', label: 'Organismes conformes', sub: 'Conformes et partiellement conformes', icon: BadgeCheck, count: nbConformes },
          { key: 'responsables', label: 'Responsables de traitement', sub: 'Tous les organismes recensés', icon: Users, count: nbTotal },
        ] as const).map(({ key, label, sub, icon: Icon, count }) => {
          const actif = vue === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => changerVue(key)}
              aria-pressed={actif}
              className={cn(
                'flex items-center gap-3 rounded-[var(--radius-card)] border-2 bg-white p-4 text-left transition-all',
                actif ? 'border-[var(--brand-primary)] shadow-card' : 'border-transparent hover:border-[var(--brand-gray)]'
              )}
            >
              <span className={cn(
                'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-colors',
                actif ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
              )}>
                <Icon className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-display font-bold text-[15px] text-[var(--brand-dark)]">{label}</span>
                <span className="block text-xs text-[var(--brand-muted)]">{sub}</span>
              </span>
              <span className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-bold',
                actif ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--brand-gray)] text-[var(--brand-dark)]'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filtres — toutes les inputs/selects partagent la meme hauteur h-11 */}
      <div className="card mb-6 p-4 md:p-5">
      <div className={cn(
        'grid grid-cols-1 sm:grid-cols-2 gap-3 [&_input]:h-11 [&_select]:h-11',
        'lg:grid-cols-5'
      )}>
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
            {secteurs.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="form-group mb-0">
          <select
            value={filters.ville ?? ''}
            onChange={(e) => updateFilter('ville', e.target.value)}
            className="w-full py-2.5"
          >
            <option value="">Toutes les villes</option>
            {villes.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="form-group mb-0">
          <select
            value={filters.region ?? ''}
            onChange={(e) => updateFilter('region', e.target.value)}
            className="w-full py-2.5"
          >
            <option value="">Toutes les régions</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
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

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--brand-gray)] pt-3 text-sm">
        <span className="text-[var(--brand-muted)]">
          <strong className="font-display text-[var(--brand-dark)]">{data?.total ?? 0}</strong>{' '}
          organisme{(data?.total ?? 0) > 1 ? 's' : ''} trouvé{(data?.total ?? 0) > 1 ? 's' : ''}
        </span>
        {Object.values(filters).some(Boolean) && (
          <button
            type="button"
            onClick={() => { setFilters({}); setPage(1); }}
            className="inline-flex items-center gap-1.5 font-semibold text-[var(--brand-primary-hover)] hover:underline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser les filtres
          </button>
        )}
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
        <EmptyState
          icon={Building2}
          title={Object.values(filters).some(Boolean) ? 'Aucun organisme ne correspond' : vue === 'conformes' ? 'Aucun organisme conforme publié pour le moment' : 'Aucun responsable de traitement enregistré pour le moment'}
          description={
            Object.values(filters).some(Boolean)
              ? 'Modifiez ou réinitialisez les filtres pour élargir la recherche.'
              : "Les organismes évalués par l'ARTCI apparaîtront ici dès leur publication."
          }
        />
      ) : (
        <>
          <div className="table-container overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr>
                  <th className="whitespace-nowrap">Dénomination</th>
                  {vue === 'conformes' && <th className="whitespace-nowrap">Statut</th>}
                  <th className="whitespace-nowrap">Forme juridique</th>
                  <th className="whitespace-nowrap">Secteur</th>
                  <th className="whitespace-nowrap">Ville</th>
                  <th className="whitespace-nowrap">Géo</th>
                  <th className="whitespace-nowrap">Finalité principale</th>
                  <th className="whitespace-nowrap">CPD (DPO)</th>
                  <th className="whitespace-nowrap">Coordonnées DPO</th>
                  <th className="whitespace-nowrap">Autorisation</th>
                  <th className="whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entite) => (
                  <tr key={entite.id}>
                    <td className="font-semibold whitespace-nowrap">{entite.denomination}</td>
                    {vue === 'conformes' && (
                      <td className="whitespace-nowrap">
                        <StatusBadge statut={entite.statut_conformite} />
                      </td>
                    )}
                    <td className="text-sm whitespace-nowrap">{entite.forme_juridique ?? '-'}</td>
                    <td className="text-sm whitespace-nowrap">{entite.secteur_activite ?? '-'}</td>
                    <td className="text-sm whitespace-nowrap">{entite.ville ?? '-'}</td>
                    <td>
                      {entite.latitude && entite.longitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${entite.latitude},${entite.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--brand-primary)] hover:underline"
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
                        <span className="text-[var(--brand-secondary)] font-semibold">Oui</span>
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
                                className="text-[var(--brand-primary)] hover:underline truncate"
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
                                className="text-[var(--brand-primary)] hover:underline"
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
                              className="flex items-center gap-1 text-[var(--brand-primary)] hover:underline text-xs font-semibold"
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
                      <Link
                        to={`/entites/${entite.id}`}
                        state={{ from: `/entites${vue === 'responsables' ? '?vue=responsables' : ''}` }}
                        className="text-[var(--brand-primary)] hover:underline flex items-center gap-1 whitespace-nowrap"
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
    </>
  );
}

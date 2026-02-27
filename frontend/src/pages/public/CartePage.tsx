import { useState, useCallback } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as publicApi from '@/api/public.api';
import MapView from '@/components/map/MapContainer';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import Loading from '@/components/common/Loading';
import { formatNumber } from '@/utils/format';

const SECTEURS = [
  'Tous les secteurs',
  'Télécommunications',
  'Banque / Finance',
  'Commerce',
  'Santé',
  'Éducation',
  'Transport',
  'Administration publique',
  'Assurance',
  'Autre',
];

const REGIONS = [
  'Toutes les régions',
  'Abidjan',
  'Bas-Sassandra',
  'Comoé',
  'Denguélé',
  'Gôh-Djiboua',
  'Lacs',
  'Lagunes',
  'Montagnes',
  'Sassandra-Marahoué',
  'Savanes',
  'Vallée du Bandama',
  'Woroba',
  'Yamoussoukro',
  'Zanzan',
];

interface StatutFilter {
  conforme: boolean;
  achevee: boolean;
  en_cours: boolean;
}

export default function CartePage() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [secteur, setSecteur] = useState('');
  const [region, setRegion] = useState('');
  const [statuts, setStatuts] = useState<StatutFilter>({
    conforme: true,
    achevee: false,
    en_cours: false,
  });
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // Debounce search
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => setSearch(val), 300);
    setDebounceTimer(timer);
  };

  // Build statut_conformite param
  const buildStatutParam = useCallback((): string | undefined => {
    const selected: string[] = [];
    if (statuts.conforme) selected.push('Conforme');
    if (statuts.achevee) selected.push('Démarche achevée');
    if (statuts.en_cours) selected.push('Démarche en cours');
    return selected.length > 0 ? selected.join(',') : undefined;
  }, [statuts]);

  const { data: statsData, isLoading: statsLoading } = useApi(
    () => publicApi.getStats(),
    []
  );

  const fetchEntites = useCallback(
    () =>
      publicApi.getEntites({
        search: search || undefined,
        secteur_activite: secteur || undefined,
        region: region || undefined,
        statut_conformite: buildStatutParam(),
        per_page: 2000,
      }),
    [search, secteur, region, buildStatutParam]
  );
  const { data: entitesData, isLoading: entitesLoading, error } = useApi(fetchEntites, [
    search,
    secteur,
    region,
    statuts.conforme,
    statuts.achevee,
    statuts.en_cours,
  ]);

  const handleStatutChange = (key: keyof StatutFilter) => {
    setStatuts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Check if any statut is selected
  const hasStatutSelected = statuts.conforme || statuts.achevee || statuts.en_cours;

  return (
    <div className="flex" style={{ height: 'calc(100vh - 70px)' }}>
      {/* Sidebar Filtres - Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-[300px] flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-5 flex-1 flex flex-col">
          <h2 className="text-xl font-bold text-black mb-5 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtres
          </h2>

          {/* Recherche */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Rechercher une entité..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[var(--artci-orange)] text-sm"
              />
            </div>
          </div>

          {/* Statut */}
          <div className="mb-6">
            <label className="block font-bold text-sm text-black mb-2.5">Statut</label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statuts.conforme}
                  onChange={() => handleStatutChange('conforme')}
                  className="w-4 h-4 accent-[#228B22]"
                />
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#228B22]" />
                <span className="text-sm">Conforme</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statuts.achevee}
                  onChange={() => handleStatutChange('achevee')}
                  className="w-4 h-4 accent-[#FF8C00]"
                />
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FF8C00]" />
                <span className="text-sm">Démarche achevée</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statuts.en_cours}
                  onChange={() => handleStatutChange('en_cours')}
                  className="w-4 h-4 accent-[#4A90E2]"
                />
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#4A90E2]" />
                <span className="text-sm">Démarche en cours</span>
              </label>
            </div>
          </div>

          {/* Secteur d'activité */}
          <div className="mb-6">
            <label className="block font-bold text-sm text-black mb-2.5">
              Secteur d&apos;activité
            </label>
            <select
              value={secteur}
              onChange={(e) => setSecteur(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[var(--artci-orange)]"
            >
              {SECTEURS.map((s) => (
                <option key={s} value={s === 'Tous les secteurs' ? '' : s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Région */}
          <div className="mb-6">
            <label className="block font-bold text-sm text-black mb-2.5">Région</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[var(--artci-orange)]"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r === 'Toutes les régions' ? '' : r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-gray-400 text-center mt-auto pt-4">&copy; 2026 ARTCI</p>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarMobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setSidebarMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-[70px] bottom-0 w-[300px] bg-white z-50 overflow-y-auto shadow-xl">
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-black flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtres
                </h2>
                <button onClick={() => setSidebarMobileOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Recherche mobile */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Rechercher une entité..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[var(--artci-orange)] text-sm"
                  />
                </div>
              </div>

              {/* Statut mobile */}
              <div className="mb-6">
                <label className="block font-bold text-sm text-black mb-2.5">Statut</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statuts.conforme}
                      onChange={() => handleStatutChange('conforme')}
                      className="w-4 h-4 accent-[#228B22]"
                    />
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#228B22]" />
                    <span className="text-sm">Conforme</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statuts.achevee}
                      onChange={() => handleStatutChange('achevee')}
                      className="w-4 h-4 accent-[#FF8C00]"
                    />
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FF8C00]" />
                    <span className="text-sm">Démarche achevée</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statuts.en_cours}
                      onChange={() => handleStatutChange('en_cours')}
                      className="w-4 h-4 accent-[#4A90E2]"
                    />
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#4A90E2]" />
                    <span className="text-sm">Démarche en cours</span>
                  </label>
                </div>
              </div>

              {/* Secteur mobile */}
              <div className="mb-6">
                <label className="block font-bold text-sm text-black mb-2.5">
                  Secteur d&apos;activité
                </label>
                <select
                  value={secteur}
                  onChange={(e) => setSecteur(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[var(--artci-orange)]"
                >
                  {SECTEURS.map((s) => (
                    <option key={s} value={s === 'Tous les secteurs' ? '' : s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Région mobile */}
              <div className="mb-6">
                <label className="block font-bold text-sm text-black mb-2.5">Région</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[var(--artci-orange)]"
                >
                  {REGIONS.map((r) => (
                    <option key={r} value={r === 'Toutes les régions' ? '' : r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-gray-400 text-center pt-4">&copy; 2026 ARTCI</p>
            </div>
          </aside>
        </>
      )}

      {/* Zone principale */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Bouton filtres mobile */}
        <div className="lg:hidden p-3">
          <button
            onClick={() => setSidebarMobileOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded text-sm font-semibold"
          >
            <Filter className="w-4 h-4" />
            Filtres
          </button>
        </div>

        {/* Mini-stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 px-5 py-4">
          {statsLoading ? (
            <div className="col-span-3 flex justify-center py-4">
              <Loading size="sm" />
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-[#228B22]">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Entit&eacute;s Conformes
                </p>
                <p className="text-3xl font-bold text-black">
                  {formatNumber(statsData?.total_entites_conformes ?? 0)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-[#FF8C00]">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  D&eacute;marche Achev&eacute;e
                </p>
                <p className="text-3xl font-bold text-black">
                  {formatNumber(statsData?.total_demarche_achevee ?? 0)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-[#4A90E2]">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  D&eacute;marche en Cours
                </p>
                <p className="text-3xl font-bold text-black">
                  {formatNumber(statsData?.total_demarche_en_cours ?? 0)}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Carte */}
        <div className="flex-1 px-5 pb-5">
          {error ? (
            <ErrorDisplay message={error} />
          ) : !hasStatutSelected ? (
            <div
              className="flex items-center justify-center bg-gray-100 rounded-lg text-gray-500"
              style={{ height: '100%', minHeight: '400px' }}
            >
              Sélectionnez au moins un statut pour afficher les entités.
            </div>
          ) : (
            <MapView
              entites={entitesData?.items ?? []}
              isLoading={entitesLoading}
            />
          )}
        </div>

        {/* Compteur */}
        {entitesData && !entitesLoading && hasStatutSelected && (
          <p className="text-sm text-gray-500 pb-3 text-center">
            {formatNumber(entitesData.total)} entité{entitesData.total > 1 ? 's' : ''} sur la
            carte
          </p>
        )}
      </div>
    </div>
  );
}

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
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

  // Mobile states
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startTranslate: number } | null>(null);

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

  const hasStatutSelected = statuts.conforme || statuts.achevee || statuts.en_cours;

  // Count active filters
  const activeFilterCount =
    (statuts.conforme ? 1 : 0) +
    (statuts.achevee ? 1 : 0) +
    (statuts.en_cours ? 1 : 0) +
    (secteur ? 1 : 0) +
    (region ? 1 : 0) +
    (search ? 1 : 0);

  // Reset filters
  const resetFilters = () => {
    setStatuts({ conforme: true, achevee: false, en_cours: false });
    setSecteur('');
    setRegion('');
    setSearchInput('');
    setSearch('');
  };

  // Body scroll lock when bottom sheet is open
  useEffect(() => {
    if (bottomSheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [bottomSheetOpen]);

  // Bottom sheet drag-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    dragRef.current = {
      startY: e.touches[0].clientY,
      startTranslate: 0,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current || !sheetRef.current) return;
    const diff = e.touches[0].clientY - dragRef.current.startY;
    if (diff > 0) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
      dragRef.current.startTranslate = diff;
    }
  };

  const handleTouchEnd = () => {
    if (!dragRef.current || !sheetRef.current) return;
    if (dragRef.current.startTranslate > 100) {
      setBottomSheetOpen(false);
    }
    sheetRef.current.style.transform = '';
    dragRef.current = null;
  };

  // Shared filter content (used in desktop sidebar and mobile bottom sheet)
  const filterContent = (isMobile: boolean) => (
    <>
      {/* Recherche */}
      <div className={isMobile ? 'mb-5' : 'mb-6'}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher une entité..."
            className={`w-full pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--artci-orange)] ${
              isMobile ? 'py-3 text-base' : 'py-2.5 text-sm'
            }`}
          />
        </div>
      </div>

      {/* Statut */}
      <div className={isMobile ? 'mb-5' : 'mb-6'}>
        <label className={`block font-bold text-black ${isMobile ? 'text-base mb-3' : 'text-sm mb-2.5'}`}>
          Statut
        </label>
        <div className={isMobile ? 'space-y-4' : 'space-y-3'}>
          <label className={`flex items-center gap-3 cursor-pointer ${isMobile ? 'min-h-[44px]' : ''}`}>
            <input
              type="checkbox"
              checked={statuts.conforme}
              onChange={() => handleStatutChange('conforme')}
              className={`accent-[#228B22] ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`}
            />
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#228B22]" />
            <span className={isMobile ? 'text-base' : 'text-sm'}>Conforme</span>
          </label>
          <label className={`flex items-center gap-3 cursor-pointer ${isMobile ? 'min-h-[44px]' : ''}`}>
            <input
              type="checkbox"
              checked={statuts.achevee}
              onChange={() => handleStatutChange('achevee')}
              className={`accent-[#FF8C00] ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`}
            />
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FF8C00]" />
            <span className={isMobile ? 'text-base' : 'text-sm'}>Démarche achevée</span>
          </label>
          <label className={`flex items-center gap-3 cursor-pointer ${isMobile ? 'min-h-[44px]' : ''}`}>
            <input
              type="checkbox"
              checked={statuts.en_cours}
              onChange={() => handleStatutChange('en_cours')}
              className={`accent-[#4A90E2] ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`}
            />
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#4A90E2]" />
            <span className={isMobile ? 'text-base' : 'text-sm'}>Démarche en cours</span>
          </label>
        </div>
      </div>

      {/* Secteur */}
      <div className={isMobile ? 'mb-5' : 'mb-6'}>
        <label className={`block font-bold text-black ${isMobile ? 'text-base mb-3' : 'text-sm mb-2.5'}`}>
          Secteur d&apos;activité
        </label>
        <div className="relative">
          <select
            value={secteur}
            onChange={(e) => setSecteur(e.target.value)}
            className={`w-full px-3 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:border-[var(--artci-orange)] ${
              isMobile ? 'py-3 text-base' : 'py-2.5 text-sm'
            }`}
          >
            {SECTEURS.map((s) => (
              <option key={s} value={s === 'Tous les secteurs' ? '' : s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Région */}
      <div className={isMobile ? 'mb-5' : 'mb-6'}>
        <label className={`block font-bold text-black ${isMobile ? 'text-base mb-3' : 'text-sm mb-2.5'}`}>
          Région
        </label>
        <div className="relative">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className={`w-full px-3 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:border-[var(--artci-orange)] ${
              isMobile ? 'py-3 text-base' : 'py-2.5 text-sm'
            }`}
          >
            {REGIONS.map((r) => (
              <option key={r} value={r === 'Toutes les régions' ? '' : r}>
                {r}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>
    </>
  );

  return (
    <div className="flex carte-page-container">
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden lg:flex lg:flex-col w-[300px] flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-5 flex-1 flex flex-col">
          <h2 className="text-xl font-bold text-black mb-5 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtres
          </h2>
          {filterContent(false)}
          <p className="text-xs text-gray-400 text-center mt-auto pt-4">&copy; 2026 ARTCI</p>
        </div>
      </aside>

      {/* ===== ZONE PRINCIPALE ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mini-stats : horizontal scroll on mobile, grid on desktop */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-5 lg:px-5 lg:py-4">
          {/* Mobile: horizontal scroll */}
          <div className="lg:hidden overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 px-4 py-3" style={{ minWidth: 'max-content' }}>
              {statsLoading ? (
                <div className="flex justify-center py-4 w-full">
                  <Loading size="sm" />
                </div>
              ) : (
                <>
                  <div className="flex-shrink-0 w-[130px] bg-white rounded-lg shadow-md p-3 border-l-[3px] border-[#228B22]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Conformes</p>
                    <p className="text-2xl font-bold text-black">
                      {formatNumber(statsData?.total_entites_conformes ?? 0)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 w-[130px] bg-white rounded-lg shadow-md p-3 border-l-[3px] border-[#FF8C00]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Achevée</p>
                    <p className="text-2xl font-bold text-black">
                      {formatNumber(statsData?.total_demarche_achevee ?? 0)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 w-[130px] bg-white rounded-lg shadow-md p-3 border-l-[3px] border-[#4A90E2]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">En Cours</p>
                    <p className="text-2xl font-bold text-black">
                      {formatNumber(statsData?.total_demarche_en_cours ?? 0)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Desktop: grid */}
          <div className="hidden lg:contents">
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
        </div>

        {/* Carte */}
        <div className="flex-1 lg:px-5 lg:pb-5 relative">
          {error ? (
            <ErrorDisplay message={error} />
          ) : !hasStatutSelected ? (
            <div
              className="flex items-center justify-center bg-gray-100 lg:rounded-lg text-gray-500 text-center px-4"
              style={{ height: '100%', minHeight: '300px' }}
            >
              Sélectionnez au moins un statut pour afficher les entités.
            </div>
          ) : (
            <div className="h-full" style={{ minHeight: '300px' }}>
              <MapView
                entites={entitesData?.items ?? []}
                isLoading={entitesLoading}
              />
            </div>
          )}

          {/* Compteur sur la carte (desktop) */}
          {entitesData && !entitesLoading && hasStatutSelected && (
            <p className="hidden lg:block text-sm text-gray-500 py-2 text-center">
              {formatNumber(entitesData.total)} entité{entitesData.total > 1 ? 's' : ''} sur la carte
            </p>
          )}
        </div>
      </div>

      {/* ===== MOBILE: BOUTON FILTRES STICKY BOTTOM ===== */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[998] bg-white border-t border-gray-200 px-4 py-2.5 shadow-[0_-2px_8px_rgba(0,0,0,0.1)]">
        <button
          onClick={() => setBottomSheetOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#FF8C00] text-white font-bold text-base rounded-lg active:bg-[#E67E00] transition-colors"
        >
          <Filter className="w-5 h-5" />
          Filtres
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-white text-[#FF8C00] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        {/* Compteur mobile */}
        {entitesData && !entitesLoading && hasStatutSelected && (
          <p className="text-xs text-gray-400 text-center mt-1">
            {formatNumber(entitesData.total)} entité{entitesData.total > 1 ? 's' : ''} sur la carte
          </p>
        )}
      </div>

      {/* ===== MOBILE: BOTTOM SHEET FILTRES ===== */}
      {bottomSheetOpen && (
        <>
          {/* Overlay */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-[999] bottom-sheet-overlay"
            onClick={() => setBottomSheetOpen(false)}
          />

          {/* Sheet */}
          <div
            ref={sheetRef}
            className="lg:hidden fixed bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-2xl bottom-sheet-enter flex flex-col"
            style={{ maxHeight: '85vh' }}
          >
            {/* Drag Handle */}
            <div
              className="flex justify-center py-3 cursor-grab"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-black">Filtres</h3>
              <button
                onClick={() => setBottomSheetOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content (scrollable) */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {filterContent(true)}
            </div>

            {/* Footer buttons */}
            <div className="flex gap-3 px-5 py-4 border-t border-gray-200 bg-white">
              <button
                onClick={resetFilters}
                className="flex-[4] py-3 border-2 border-[#FF8C00] text-[#FF8C00] font-bold text-base rounded-lg active:bg-orange-50 transition-colors"
              >
                Réinitialiser
              </button>
              <button
                onClick={() => setBottomSheetOpen(false)}
                className="flex-[6] py-3 bg-[#FF8C00] text-white font-bold text-base rounded-lg active:bg-[#E67E00] transition-colors"
              >
                Appliquer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

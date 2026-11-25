import { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ChevronDown, RotateCcw, Check, UserPlus } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as publicApi from '@/api/public.api';
import MapView from '@/components/map/MapContainer';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { formatNumber } from '@/utils/format';
import { ROUTES, STATUT_COLORS } from '@/utils/constants';
import { cn } from '@/utils/cn';

interface StatutFilter {
  conforme: boolean;
  partiellement: boolean;
  nonConforme: boolean;
}

const COLOR_CONFORME = STATUT_COLORS['Conforme'];
const COLOR_PARTIEL = STATUT_COLORS['Partiellement conforme'];
const COLOR_NON = STATUT_COLORS['Non conforme'];

export default function CartePage() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [secteur, setSecteur] = useState('');
  const [region, setRegion] = useState('');
  const [statuts, setStatuts] = useState<StatutFilter>({
    conforme: true,
    partiellement: true,
    nonConforme: true,
  });

  // Mobile states
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startTranslate: number } | null>(null);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 300);
  };

  // Build statut_conformite param.
  // Pour 'Partiellement conforme', on envoie aussi les anciens libelles
  // (rows historiques) afin de ne pas perdre de fiches publiees.
  const buildStatutParam = useCallback((): string | undefined => {
    const selected: string[] = [];
    if (statuts.conforme) selected.push('Conforme');
    if (statuts.partiellement) {
      selected.push('Partiellement conforme');
      selected.push('Démarche achevée');
      selected.push('Démarche en cours');
    }
    if (statuts.nonConforme) selected.push('Non conforme');
    return selected.length > 0 ? selected.join(',') : undefined;
  }, [statuts]);

  const { data: statsData } = useApi(() => publicApi.getStats(), []);

  // Dropdowns alimentes par les vraies valeurs en base (filtrees aux entites
  // publiables visibles). Plus de listes hardcodees.
  const secteursDisponibles = Object.keys(statsData?.par_secteur ?? {}).sort();
  const regionsDisponibles = Object.keys(statsData?.par_region ?? {}).sort();
  const nbConformes = statsData?.total_entites_conformes ?? 0;
  const nbPartiels = statsData?.total_partiellement_conformes ?? 0;
  const nbNonConformes = statsData?.total_non_conformes ?? 0;
  const totalPublies = nbConformes + nbPartiels + nbNonConformes;

  const fetchEntites = useCallback(
    () =>
      publicApi.getEntites({
        search: search || undefined,
        secteur_activite: secteur || undefined,
        region: region || undefined,
        statut_conformite: buildStatutParam(),
        avec_gps: 'true',
        per_page: 2000,
      }),
    [search, secteur, region, buildStatutParam]
  );
  const { data: entitesData, isLoading: entitesLoading, error } = useApi(fetchEntites, [
    search,
    secteur,
    region,
    statuts.conforme,
    statuts.partiellement,
    statuts.nonConforme,
  ]);

  const handleStatutChange = (key: keyof StatutFilter) => {
    setStatuts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasStatutSelected = statuts.conforme || statuts.partiellement || statuts.nonConforme;

  // Filtres reellement restrictifs (les 2 statuts coches = etat par defaut)
  const activeFilterCount =
    (!statuts.conforme || !statuts.partiellement || !statuts.nonConforme ? 1 : 0) +
    (secteur ? 1 : 0) +
    (region ? 1 : 0) +
    (search ? 1 : 0);

  const resetFilters = () => {
    setStatuts({ conforme: true, partiellement: true, nonConforme: true });
    setSecteur('');
    setRegion('');
    setSearchInput('');
    setSearch('');
  };

  // Body scroll lock when bottom sheet is open
  useEffect(() => {
    document.body.style.overflow = bottomSheetOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [bottomSheetOpen]);

  // Bottom sheet drag-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    dragRef.current = { startY: e.touches[0].clientY, startTranslate: 0 };
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
    if (dragRef.current.startTranslate > 100) setBottomSheetOpen(false);
    sheetRef.current.style.transform = '';
    dragRef.current = null;
  };

  // Message affiche sur la carte quand elle est vide
  const empty =
    activeFilterCount > 0
      ? { title: 'Aucun résultat', text: 'Aucun organisme publié ne correspond à ces filtres.' }
      : {
          title: 'Aucun organisme publié pour le moment',
          text: "Les organismes évalués par l'ARTCI apparaîtront ici dès leur publication.",
        };

  const nbSurCarte = entitesData?.total ?? 0;

  const labelCls = 'block font-display text-xs font-bold uppercase tracking-[0.06em] text-[var(--brand-dark)] mb-2.5';
  const selectCls =
    'w-full appearance-none rounded-[10px] border border-gray-300 bg-white pl-3 pr-9 text-[var(--brand-text)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-[3px] focus:ring-[rgba(255,140,0,0.18)]';

  // Contenu des filtres (sidebar desktop + bottom sheet mobile)
  const filterContent = (isMobile: boolean) => (
    <div className="space-y-6">
      {/* Recherche */}
      <div>
        <label htmlFor={isMobile ? 'carte-search-m' : 'carte-search'} className={labelCls}>
          Rechercher
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id={isMobile ? 'carte-search-m' : 'carte-search'}
            type="search"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Nom de l'organisme…"
            className={cn(
              'w-full pl-10 pr-4 rounded-[10px] border border-gray-300 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-[3px] focus:ring-[rgba(255,140,0,0.18)]',
              isMobile ? 'py-3 text-base' : 'py-2.5 text-sm'
            )}
          />
        </div>
      </div>

      {/* Statut : cartes a bascule aux couleurs des marqueurs */}
      <div>
        <span className={labelCls}>Statut de conformité</span>
        <div className="space-y-2">
          <StatutToggle
            label="Conforme"
            color={COLOR_CONFORME}
            count={nbConformes}
            checked={statuts.conforme}
            onToggle={() => handleStatutChange('conforme')}
            large={isMobile}
          />
          <StatutToggle
            label="Partiellement conforme"
            color={COLOR_PARTIEL}
            count={nbPartiels}
            checked={statuts.partiellement}
            onToggle={() => handleStatutChange('partiellement')}
            large={isMobile}
          />
          <StatutToggle
            label="Non conforme"
            color={COLOR_NON}
            count={nbNonConformes}
            checked={statuts.nonConforme}
            onToggle={() => handleStatutChange('nonConforme')}
            large={isMobile}
          />
        </div>
      </div>

      {/* Secteur */}
      <div>
        <label htmlFor={isMobile ? 'carte-secteur-m' : 'carte-secteur'} className={labelCls}>
          Secteur d&apos;activité
        </label>
        <div className="relative">
          <select
            id={isMobile ? 'carte-secteur-m' : 'carte-secteur'}
            value={secteur}
            onChange={(e) => setSecteur(e.target.value)}
            className={cn(selectCls, isMobile ? 'py-3 text-base' : 'py-2.5 text-sm')}
          >
            <option value="">Tous les secteurs</option>
            {secteursDisponibles.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Region */}
      <div>
        <label htmlFor={isMobile ? 'carte-region-m' : 'carte-region'} className={labelCls}>
          Région
        </label>
        <div className="relative">
          <select
            id={isMobile ? 'carte-region-m' : 'carte-region'}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className={cn(selectCls, isMobile ? 'py-3 text-base' : 'py-2.5 text-sm')}
          >
            <option value="">Toutes les régions</option>
            {regionsDisponibles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex carte-page-container bg-[var(--brand-bg)]">
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden lg:flex lg:flex-col w-[320px] flex-shrink-0 bg-white border-r border-[var(--brand-gray)] overflow-y-auto">
        <div className="p-6 flex-1 flex flex-col">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--brand-primary)]">
              Cartographie nationale
            </p>
            <h1 className="mt-1 text-2xl">Responsables de traitement</h1>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
              {formatNumber(totalPublies)} organisme{totalPublies > 1 ? 's' : ''} publié{totalPublies > 1 ? 's' : ''} par l'ARTCI
            </p>
          </div>

          {filterContent(false)}

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 inline-flex items-center justify-center gap-2 text-sm font-semibold text-[var(--brand-primary-hover)] hover:underline"
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser les filtres
            </button>
          )}

          {/* Appel a l'action */}
          <div className="mt-auto pt-8">
            <div className="rounded-[var(--radius-card)] bg-[var(--brand-primary-soft)] p-4">
              <p className="font-display text-sm font-bold text-[var(--brand-dark)]">
                Votre organisme n&apos;est pas sur la carte ?
              </p>
              <p className="mt-1 text-xs text-[#334155]">
                Inscrivez-le et renseignez sa cartographie pour être évalué par l&apos;ARTCI.
              </p>
              <Link to={ROUTES.REGISTER} className="btn btn-primary mt-3 w-full py-2 text-sm">
                <UserPlus className="w-4 h-4" />
                S&apos;inscrire
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* ===== CARTE ===== */}
      <div className="flex-1 relative lg:p-4">
        {error ? (
          <div className="p-4"><ErrorDisplay message={error} /></div>
        ) : !hasStatutSelected ? (
          <div className="h-full flex items-center justify-center lg:rounded-[var(--radius-card)] bg-white text-[var(--brand-muted)] text-center px-4">
            Sélectionnez au moins un statut pour afficher les organismes.
          </div>
        ) : (
          <div className="h-full lg:rounded-[var(--radius-card)] lg:shadow-card overflow-hidden">
            <MapView
              entites={entitesData?.items ?? []}
              isLoading={entitesLoading}
              emptyTitle={empty.title}
              emptyText={empty.text}
            />
          </div>
        )}

        {/* Pastilles flottantes : compteur + legende */}
        {hasStatutSelected && !error && (
          <>
            <div className="pointer-events-none absolute left-3 top-3 lg:left-7 lg:top-7 z-[400]">
              <div className="rounded-full bg-white/95 px-4 py-2 shadow-card">
                <span className="font-display text-sm font-bold text-[var(--brand-dark)]">
                  {entitesLoading ? '…' : formatNumber(nbSurCarte)}
                </span>
                <span className="ml-1.5 text-sm text-[var(--brand-muted)]">
                  organisme{nbSurCarte > 1 ? 's' : ''} sur la carte
                </span>
              </div>
            </div>

            <div className="pointer-events-none absolute left-3 bottom-[96px] lg:left-7 lg:bottom-9 z-[400]">
              <ul className="rounded-xl bg-white/95 px-3.5 py-2.5 shadow-card space-y-1.5 text-xs text-[#334155]">
                <li className="flex items-center gap-2">
                  <LegendPin color={COLOR_CONFORME} /> Conforme
                </li>
                <li className="flex items-center gap-2">
                  <LegendPin color={COLOR_PARTIEL} /> Partiellement conforme
                </li>
                <li className="flex items-center gap-2">
                  <LegendPin color={COLOR_NON} /> Non conforme
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand-dark)] text-[8px] font-bold text-white ring-2 ring-[var(--brand-primary)]">
                    3
                  </span>
                  Regroupement
                </li>
              </ul>
            </div>
          </>
        )}
      </div>

      {/* ===== MOBILE : BOUTON FILTRES STICKY BOTTOM ===== */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[998] bg-white border-t border-[var(--brand-gray)] px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)]">
        <button
          onClick={() => setBottomSheetOpen(true)}
          className="btn btn-primary w-full py-3 text-base"
        >
          <SlidersHorizontal className="w-5 h-5" />
          Filtrer la carte
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-white text-[var(--brand-primary-hover)] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ===== MOBILE : BOTTOM SHEET FILTRES ===== */}
      {bottomSheetOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-[rgba(15,23,42,0.5)] z-[999] bottom-sheet-overlay"
            onClick={() => setBottomSheetOpen(false)}
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Filtres de la carte"
            className="lg:hidden fixed bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-3xl bottom-sheet-enter flex flex-col"
            style={{ maxHeight: '85vh' }}
          >
            <div
              className="flex justify-center py-3 cursor-grab"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-5 pb-4 border-b border-[var(--brand-gray)]">
              <h3 className="text-xl">Filtrer la carte</h3>
              <button
                onClick={() => setBottomSheetOpen(false)}
                aria-label="Fermer"
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">{filterContent(true)}</div>

            <div className="flex gap-3 px-5 py-4 border-t border-[var(--brand-gray)] bg-white">
              <button onClick={resetFilters} className="btn btn-outline flex-[4] py-3">
                Réinitialiser
              </button>
              <button onClick={() => setBottomSheetOpen(false)} className="btn btn-primary flex-[6] py-3">
                Voir {entitesLoading ? '' : formatNumber(nbSurCarte)} résultat{nbSurCarte > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Carte a bascule pour un statut : pastille couleur, libelle, nombre. */
function StatutToggle({
  label, color, count, checked, onToggle, large,
}: {
  label: string; color: string; count: number; checked: boolean; onToggle: () => void; large?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-3 rounded-[10px] border px-3 text-left transition-colors',
        large ? 'py-3 min-h-[48px]' : 'py-2.5',
        checked ? 'bg-white shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-90'
      )}
      style={checked ? { borderColor: color } : undefined}
    >
      <span
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2"
        style={{ borderColor: color, background: checked ? color : 'transparent' }}
      >
        {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
      </span>
      <span className={cn('flex-1 font-medium text-[var(--brand-text)]', large ? 'text-base' : 'text-sm')}>
        {label}
      </span>
      <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: color }}>
        {formatNumber(count)}
      </span>
    </button>
  );
}

function LegendPin({ color }: { color: string }) {
  return (
    <svg width="12" height="16" viewBox="0 0 30 42" aria-hidden="true">
      <path d="M15 1C7.3 1 1 7.3 1 15c0 10.8 14 26 14 26s14-15.2 14-26C29 7.3 22.7 1 15 1z" fill={color} stroke="#fff" strokeWidth="2" />
      <circle cx="15" cy="15" r="5.5" fill="#fff" />
    </svg>
  );
}

import { useEffect } from 'react';
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, useMap, LayersControl, LayerGroup, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { MapPinOff, Loader2 } from 'lucide-react';
import type { EntiteListItem } from '@/types/entite';
import type { StatutConformite } from '@/types/enums';
import EntityPopup from './EntityPopup';
import { STATUT_COLORS } from '@/utils/constants';

/** Vue d'ensemble de la Cote d'Ivoire (quand aucun marqueur n'est affiche). */
const CI_CENTER: [number, number] = [7.55, -5.55];
const CI_ZOOM = 7;

/** Marqueur "epingle" colore selon le statut de conformite (cache par couleur). */
const iconCache = new Map<string, L.DivIcon>();
function markerIcon(statut: StatutConformite | null): L.DivIcon {
  const color = (statut && STATUT_COLORS[statut]) || '#FF8C00';
  let icon = iconCache.get(color);
  if (!icon) {
    icon = new L.DivIcon({
      className: 'dcp-marker',
      html: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M15 1C7.3 1 1 7.3 1 15c0 10.8 14 26 14 26s14-15.2 14-26C29 7.3 22.7 1 15 1z" fill="${color}" stroke="#fff" stroke-width="2"/>
        <circle cx="15" cy="15" r="5.5" fill="#fff"/>
      </svg>`,
      iconSize: [30, 42],
      iconAnchor: [15, 41],
      popupAnchor: [0, -38],
    });
    iconCache.set(color, icon);
  }
  return icon;
}

/** Pastille de regroupement : bleu nuit, anneau orange, taille selon le nombre. */
function clusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const n = cluster.getChildCount();
  const size = n < 10 ? 38 : n < 50 ? 46 : 56;
  return L.divIcon({
    html: `<span>${n}</span>`,
    className: 'dcp-cluster',
    iconSize: L.point(size, size, true),
  });
}

interface MapProps {
  entites: EntiteListItem[];
  isLoading: boolean;
  /** Message affiche sur la carte quand aucun organisme n'est a afficher. */
  emptyTitle?: string;
  emptyText?: string;
}

/** Ajuste le zoom sur les marqueurs, ou revient sur la Cote d'Ivoire si vide. */
function FitBounds({ entites }: { entites: EntiteListItem[] }) {
  const map = useMap();

  useEffect(() => {
    const points = entites
      .filter((e) => e.latitude != null && e.longitude != null)
      .map((e) => [e.latitude!, e.longitude!] as [number, number]);

    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 14 });
    } else {
      map.setView(CI_CENTER, CI_ZOOM);
    }
  }, [entites, map]);

  return null;
}

export default function MapView({ entites, isLoading, emptyTitle, emptyText }: MapProps) {
  const visibles = entites.filter((e) => e.latitude != null && e.longitude != null);

  return (
    <div className="relative h-full min-h-[300px]">
      <LeafletMap
        center={CI_CENTER}
        zoom={CI_ZOOM}
        scrollWheelZoom
        zoomControl={false}
        maxZoom={18}
        style={{ height: '100%', minHeight: '300px' }}
        className="lg:rounded-[var(--radius-card)] z-0"
      >
        <LayersControl position="topright">
          {/* Fond clair Esri (sans cle d'API) : fond gris + couche des noms de lieux */}
          <LayersControl.BaseLayer checked name="Plan">
            <LayerGroup>
              <TileLayer
                attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={16}
                maxZoom={18}
              />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={16}
                maxZoom={18}
              />
            </LayerGroup>
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Plan détaillé">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Topographique">
            <TileLayer
              attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        <ZoomControl position="bottomright" />

        {!isLoading && <FitBounds entites={entites} />}

        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          maxClusterRadius={50}
          iconCreateFunction={clusterIcon}
        >
          {visibles.map((entite) => (
            <Marker
              key={entite.id}
              position={[entite.latitude!, entite.longitude!]}
              icon={markerIcon(entite.statut_conformite)}
              title={entite.denomination}
            >
              <Popup maxWidth={320} minWidth={280}>
                <EntityPopup entite={entite} />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </LeafletMap>

      {/* Chargement : pastille au-dessus de la carte (la carte reste visible) */}
      {isLoading && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-[500] flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-[var(--brand-dark)] shadow-card">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-primary)]" />
            Chargement des organismes…
          </span>
        </div>
      )}

      {/* Aucun organisme a afficher */}
      {!isLoading && visibles.length === 0 && emptyTitle && (
        <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center p-4">
          <div className="pointer-events-auto max-w-sm rounded-[var(--radius-card)] bg-white/95 backdrop-blur-sm p-6 text-center shadow-hover">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-primary-soft)]">
              <MapPinOff className="h-6 w-6 text-[var(--brand-primary)]" />
            </span>
            <h3 className="text-lg">{emptyTitle}</h3>
            {emptyText && <p className="mt-1 text-sm text-[var(--brand-muted)]">{emptyText}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

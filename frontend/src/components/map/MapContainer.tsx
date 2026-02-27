import { useEffect } from 'react';
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import type { EntiteListItem } from '@/types/entite';
import EntityPopup from './EntityPopup';
import Loading from '@/components/common/Loading';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/utils/constants';

// Icône orange SVG pour les marqueurs
const orangeIcon = new L.DivIcon({
  className: '',
  html: `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="#FF8C00"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
  </svg>`,
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -40],
});

// Fix Leaflet default icon path issue
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapProps {
  entites: EntiteListItem[];
  isLoading: boolean;
}

/** Composant enfant qui ajuste le zoom sur la zone des marqueurs */
function FitBounds({ entites }: { entites: EntiteListItem[] }) {
  const map = useMap();

  useEffect(() => {
    if (entites.length > 0) {
      const points = entites
        .filter((e) => e.latitude && e.longitude)
        .map((e) => [e.latitude!, e.longitude!] as [number, number]);

      if (points.length > 0) {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [entites, map]);

  return null;
}

export default function MapView({ entites, isLoading }: MapProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg h-full min-h-[400px]">
        <Loading text="Chargement de la carte..." />
      </div>
    );
  }

  return (
    <LeafletMap
      center={DEFAULT_MAP_CENTER}
      zoom={DEFAULT_MAP_ZOOM}
      scrollWheelZoom={true}
      style={{ height: '100%', minHeight: '400px' }}
      className="rounded-lg z-0"
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Plan">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution='Tiles &copy; Esri'
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
      <FitBounds entites={entites} />
      {entites
        .filter((e) => e.latitude && e.longitude)
        .map((entite) => (
          <Marker
            key={entite.id}
            position={[entite.latitude!, entite.longitude!]}
            icon={orangeIcon}
          >
            <Popup maxWidth={320}>
              <EntityPopup entite={entite} />
            </Popup>
          </Marker>
        ))}
    </LeafletMap>
  );
}

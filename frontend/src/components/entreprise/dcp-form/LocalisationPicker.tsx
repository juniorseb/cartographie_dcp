/**
 * Selecteur de localisation par pointage sur carte (Leaflet).
 * - Clic sur la carte = depose un marqueur a cet endroit
 * - Bouton "Ma position" = utilise navigator.geolocation
 * - Affiche les coordonnees + permet la saisie manuelle
 */
import { useEffect, useState } from 'react';
import {
  MapContainer as LeafletMap, TileLayer, Marker, useMapEvents, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Crosshair, X as XIcon } from 'lucide-react';
import type { LocalisationGeo } from '@/types/formulaire-dcp';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/utils/constants';

const orangeIcon = new L.DivIcon({
  className: '',
  html: `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="#FF8C00"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
  </svg>`,
  iconSize: [28, 40],
  iconAnchor: [14, 40],
});

interface ClickHandlerProps {
  onPick: (lat: number, lng: number) => void;
}

function ClickHandler({ onPick }: ClickHandlerProps) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToOnChange({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 15));
  }, [position, map]);
  return null;
}

interface LocalisationPickerProps {
  value?: LocalisationGeo;
  onChange: (value: LocalisationGeo) => void;
  disabled?: boolean;
}

export default function LocalisationPicker({ value, onChange, disabled }: LocalisationPickerProps) {
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const lat = typeof value?.latitude === 'number' ? value.latitude : null;
  const lng = typeof value?.longitude === 'number' ? value.longitude : null;
  const position: [number, number] | null = lat !== null && lng !== null ? [lat, lng] : null;

  function handlePick(latitude: number, longitude: number) {
    if (disabled) return;
    onChange({ ...value, latitude: +latitude.toFixed(6), longitude: +longitude.toFixed(6) });
  }

  function handleClear() {
    onChange({});
  }

  function handleManual(field: 'latitude' | 'longitude', raw: string) {
    const num = parseFloat(raw);
    onChange({ ...value, [field]: Number.isFinite(num) ? num : undefined });
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n'est pas disponible sur ce navigateur.");
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handlePick(pos.coords.latitude, pos.coords.longitude);
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(`Impossible d'obtenir votre position : ${err.message}`);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <fieldset className="border border-gray-200 p-4 mb-4">
      <legend className="text-xs font-bold text-gray-700 px-2">Localisation géographique</legend>

      <p className="text-xs text-gray-600 mb-2">
        Cliquez sur la carte pour positionner le marqueur, ou utilisez le bouton « Ma position »
        pour récupérer vos coordonnées GPS.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={disabled || geoLoading}
          className="btn btn-outline text-xs flex items-center gap-1 px-3 py-1.5"
        >
          <Crosshair className="w-3.5 h-3.5" />
          {geoLoading ? 'Localisation...' : 'Ma position'}
        </button>
        {position && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="btn btn-outline text-xs flex items-center gap-1 px-3 py-1.5 text-red-600 border-red-200 hover:bg-red-50"
          >
            <XIcon className="w-3.5 h-3.5" />
            Effacer
          </button>
        )}
        {position && (
          <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-900 border border-orange-200 px-2 py-1 rounded">
            <MapPin className="w-3 h-3" />
            {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </span>
        )}
      </div>

      {geoError && (
        <p className="text-xs text-red-600 mb-2">{geoError}</p>
      )}

      <div style={{ height: 320, width: '100%' }} className="rounded overflow-hidden border border-gray-200">
        <LeafletMap
          center={position ?? DEFAULT_MAP_CENTER}
          zoom={position ? 15 : DEFAULT_MAP_ZOOM}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={handlePick} />
          <FlyToOnChange position={position} />
          {position && <Marker position={position} icon={orangeIcon} />}
        </LeafletMap>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <div className="form-group mb-0">
          <label className="text-xs font-semibold">Latitude</label>
          <input
            type="number"
            step="0.000001"
            value={lat ?? ''}
            disabled={disabled}
            onChange={(e) => handleManual('latitude', e.target.value)}
            placeholder="Ex : 5.336400"
          />
        </div>
        <div className="form-group mb-0">
          <label className="text-xs font-semibold">Longitude</label>
          <input
            type="number"
            step="0.000001"
            value={lng ?? ''}
            disabled={disabled}
            onChange={(e) => handleManual('longitude', e.target.value)}
            placeholder="Ex : -4.026700"
          />
        </div>
      </div>
    </fieldset>
  );
}

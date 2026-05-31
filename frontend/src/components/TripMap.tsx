import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { TRANSPORT_STYLES } from '../constants';
import type { TransportMode } from '../types';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  number: number;
  label: string;
  emoji?: string;
  variant?: 'attraction' | 'city';
}

export interface MapLeg {
  id: string;
  fromId: string;
  toId: string;
  transportMode: TransportMode;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function makeIcon(marker: MapMarker) {
  if (marker.variant === 'city') {
    return L.divIcon({
      className: '',
      html: `<div class="city-marker" title="${escapeHtml(marker.label)}">
        <span class="num">${marker.number}</span>
        <span>${escapeHtml(marker.label)}</span>
      </div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  }
  const emoji = marker.emoji || '📍';
  return L.divIcon({
    className: '',
    html: `<div class="poi-marker" title="${escapeHtml(marker.label)}">
      <span style="display:flex;flex-direction:column;align-items:center;line-height:1;">
        <span style="font-size:11px;">${marker.number}</span>
        <span style="font-size:11px;">${emoji}</span>
      </span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 10);
      return;
    }
    const bounds = L.latLngBounds(
      markers.map((m) => [m.lat, m.lng] as [number, number])
    );
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, markers]);
  return null;
}

export function TripMap({
  markers,
  legs,
  onSelectMarker,
  selectedMarkerId,
  defaultCenter = [20, 0],
  defaultZoom = 2,
}: {
  markers: MapMarker[];
  legs: MapLeg[];
  onSelectMarker?: (id: string) => void;
  selectedMarkerId?: string;
  defaultCenter?: [number, number];
  defaultZoom?: number;
}) {
  const polylines = useMemo(() => {
    const byId = new Map(markers.map((m) => [m.id, m]));
    return legs
      .map((leg) => {
        const from = byId.get(leg.fromId);
        const to = byId.get(leg.toId);
        if (!from || !to) return null;
        const style = TRANSPORT_STYLES[leg.transportMode];
        return {
          id: leg.id,
          positions: [
            [from.lat, from.lng] as [number, number],
            [to.lat, to.lng] as [number, number],
          ],
          color: style.color,
          dashArray: style.dashArray,
        };
      })
      .filter(Boolean) as {
      id: string;
      positions: [number, number][];
      color: string;
      dashArray?: string;
    }[];
  }, [legs, markers]);

  const center: [number, number] = markers[0]
    ? [markers[0].lat, markers[0].lng]
    : defaultCenter;

  return (
    <MapContainer
      center={center}
      zoom={markers[0] ? 5 : defaultZoom}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds markers={markers} />
      {polylines.map((p) => (
        <Polyline
          key={p.id}
          positions={p.positions}
          pathOptions={{
            color: p.color,
            weight: 4,
            opacity: 0.85,
            dashArray: p.dashArray,
          }}
        />
      ))}
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={makeIcon(m)}
          eventHandlers={{
            click: () => onSelectMarker?.(m.id),
          }}
          opacity={
            selectedMarkerId && selectedMarkerId !== m.id ? 0.75 : 1
          }
        />
      ))}
    </MapContainer>
  );
}

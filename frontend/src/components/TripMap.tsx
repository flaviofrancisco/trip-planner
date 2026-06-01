import { useEffect, useRef, useMemo, useCallback } from 'react';
import { TRANSPORT_STYLES } from '../constants';
import { api } from '../api';
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
  routePolyline?: string;
}

/** Decode a Google encoded polyline string into an array of LatLng points */
function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildMarkerHtml(marker: MapMarker): HTMLElement {
  const wrapper = document.createElement('div');
  if (marker.variant === 'city') {
    wrapper.innerHTML = `<div class="city-marker" title="${escapeHtml(marker.label)}">
      <span class="num">${marker.number}</span>
      <span>${escapeHtml(marker.label)}</span>
    </div>`;
  } else {
    const emoji = marker.emoji || '📍';
    wrapper.innerHTML = `<div class="poi-marker" title="${escapeHtml(marker.label)}">
      <span style="display:flex;flex-direction:column;align-items:center;line-height:1;">
        <span style="font-size:11px;">${marker.number}</span>
        <span style="font-size:11px;">${emoji}</span>
      </span>
    </div>`;
  }
  return wrapper;
}

/** Convert Leaflet-style dashArray string "6 8" to Google Maps symbol sequence */
function dashArrayToIcons(dashArray: string | undefined, color: string) {
  if (!dashArray) return undefined;
  const parts = dashArray.split(/\s+/).map(Number);
  if (parts.length < 2) return undefined;
  return [
    { icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor: color, scale: 3 }, offset: '0', repeat: `${parts[0] + parts[1]}px` },
  ];
}

export function TripMap({
  markers,
  legs,
  onSelectMarker,
  onMapDoubleClick,
  selectedMarkerId,
  defaultCenter = [20, 0],
  defaultZoom = 2,
}: {
  markers: MapMarker[];
  legs: MapLeg[];
  onSelectMarker?: (id: string) => void;
  onMapDoubleClick?: (place: { name: string; address?: string; coordinates: { lat: number; lng: number } }) => void;
  selectedMarkerId?: string;
  defaultCenter?: [number, number];
  defaultZoom?: number;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const gmMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  // Compute polyline data
  const polylines = useMemo(() => {
    const byId = new Map(markers.map((m) => [m.id, m]));
    return legs
      .map((leg) => {
        const from = byId.get(leg.fromId);
        const to = byId.get(leg.toId);
        if (!from || !to) return null;
        const style = TRANSPORT_STYLES[leg.transportMode];
        const path = leg.routePolyline
          ? decodePolyline(leg.routePolyline)
          : [
              { lat: from.lat, lng: from.lng },
              { lat: to.lat, lng: to.lng },
            ];
        return {
          id: leg.id,
          path,
          color: style.color,
          dashArray: style.dashArray,
        };
      })
      .filter(Boolean) as {
      id: string;
      path: { lat: number; lng: number }[];
      color: string;
      dashArray?: string;
    }[];
  }, [legs, markers]);

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    // Wait for Google Maps to be loaded
    if (typeof google === 'undefined' || !google.maps) {
      const interval = setInterval(() => {
        if (typeof google !== 'undefined' && google.maps) {
          clearInterval(interval);
          initMap();
        }
      }, 100);
      return () => clearInterval(interval);
    }
    initMap();

    function initMap() {
      if (!mapRef.current || mapInstance.current) return;
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: { lat: defaultCenter[0], lng: defaultCenter[1] },
        zoom: defaultZoom,
        mapId: 'trip-planner-map',
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: true,
        fullscreenControl: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable callback refs
  const onSelectRef = useRef(onSelectMarker);
  onSelectRef.current = onSelectMarker;
  const onDblClickRef = useRef(onMapDoubleClick);
  onDblClickRef.current = onMapDoubleClick;

  // Double-click to add a place
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const listener = map.addListener('dblclick', async (e: google.maps.MapMouseEvent) => {
      if (!onDblClickRef.current || !e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      let name = `(${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      let address = '';
      try {
        const label = await api.reverseGeocode(lat, lng);
        if (label) {
          name = label.split(',')[0].trim() || name;
          address = label;
        }
      } catch {}
      onDblClickRef.current({ name, address, coordinates: { lat, lng } });
    });
    return () => listener.remove();
  }, [mapInstance.current]);

  // Sync markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear old markers
    gmMarkersRef.current.forEach((m) => (m.map = null));
    gmMarkersRef.current = [];
    listenersRef.current.forEach((l) => l.remove());
    listenersRef.current = [];

    markers.forEach((m) => {
      const el = buildMarkerHtml(m);
      const isSelected = !selectedMarkerId || selectedMarkerId === m.id;
      el.style.opacity = isSelected ? '1' : '0.6';
      el.style.cursor = 'pointer';

      const advancedMarker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: m.lat, lng: m.lng },
        content: el,
        title: m.label,
      });

      const listener = advancedMarker.addListener('gmp-click', () => {
        onSelectRef.current?.(m.id);
      });

      gmMarkersRef.current.push(advancedMarker);
      listenersRef.current.push(listener);
    });
  }, [markers, selectedMarkerId]);

  // Sync polylines
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear old polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    polylines.forEach((p) => {
      const isDashed = !!p.dashArray;
      const line = new google.maps.Polyline({
        path: p.path,
        strokeColor: p.color,
        strokeWeight: 4,
        strokeOpacity: isDashed ? 0 : 0.85,
        icons: isDashed ? dashArrayToIcons(p.dashArray, p.color) : undefined,
        map,
      });
      polylinesRef.current.push(line);
    });
  }, [polylines]);

  // Fit bounds when markers change
  const fitBounds = useCallback(() => {
    const map = mapInstance.current;
    if (!map || markers.length === 0) return;

    if (markers.length === 1) {
      map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
      map.setZoom(10);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
    map.fitBounds(bounds, 40);
  }, [markers]);

  useEffect(() => {
    fitBounds();
  }, [fitBounds]);

  return <div ref={mapRef} className="h-full w-full gmap-container" />;
}

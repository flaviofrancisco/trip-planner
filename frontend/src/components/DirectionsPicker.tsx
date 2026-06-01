import { useEffect, useState } from 'react';
import { X, Clock, Ruler, Banknote, Route, Loader2, ExternalLink } from 'lucide-react';
import { api } from '../api';
import { TRANSPORT_STYLES } from '../constants';
import type { TransportMode } from '../types';

interface TransitStep {
  vehicleType: string;
  vehicleEmoji: string;
  vehicleLabel: string;
  lineName: string;
  lineColor: string | null;
  lineTextColor: string | null;
  agencyName: string;
  stopCount: number | null;
  departureStop: string;
  arrivalStop: string;
  duration: string | null;
}

interface DirectionRoute {
  summary: string;
  duration: string;
  durationValue: number;
  distance: string;
  distanceValue: number;
  fare?: { amount: number; currency: string; text: string };
  polyline: string;
  transitSteps?: TransitStep[];
}

export interface DirectionSelection {
  duration: string;
  distance: string;
  cost?: number;
  routePolyline: string;
}

// Map our transport modes to Google Maps deep-link travelmode values
const GOOGLE_TRAVELMODE: Partial<Record<TransportMode, string>> = {
  train: 'transit',
  bus: 'transit',
  metro: 'transit',
  ferry: 'transit',
  transit: 'transit',
  tram: 'transit',
  cablecar: 'transit',
  funicular: 'transit',
  foot: 'walking',
  bicycle: 'bicycling',
  taxi: 'driving',
  car: 'driving',
  motorcycle: 'driving',
};

/** Build a Google Maps directions deep-link for modes our API can't resolve (e.g. Japanese transit). */
function googleMapsDirectionsUrl(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  transportMode: TransportMode,
): string {
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
  });
  const travelmode = GOOGLE_TRAVELMODE[transportMode];
  if (travelmode) params.set('travelmode', travelmode);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function DirectionsPicker({
  origin,
  destination,
  fromLabel,
  toLabel,
  transportMode,
  onSelect,
  onClose,
}: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  fromLabel: string;
  toLabel: string;
  transportMode: TransportMode;
  onSelect: (selection: DirectionSelection) => void;
  onClose: () => void;
}) {
  const [routes, setRoutes] = useState<DirectionRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDirections = () => {
    setLoading(true);
    setError('');
    api.getDirections(origin, destination, transportMode)
      .then((res) => {
        if (res.routes.length === 0) setError(res.message || 'No routes found');
        setRoutes(res.routes);
      })
      .catch((e: any) => setError(e.message || 'Failed to fetch directions'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.getDirections(origin, destination, transportMode);
        if (cancelled) return;
        if (res.routes.length === 0) {
          setError(res.message || 'No routes found');
        } else if (res.message) {
          setError(res.message);
        }
        setRoutes(res.routes);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to fetch directions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [origin.lat, origin.lng, destination.lat, destination.lng, transportMode]);

  const style = TRANSPORT_STYLES[transportMode];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div className="card w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="min-w-0">
            <h3 className="font-bold text-sm truncate">
              {style.emoji} Directions: {fromLabel} → {toLabel}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {style.label} — pick a route
            </p>
          </div>
          <button className="btn-ghost p-1 flex-shrink-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
          {loading && (
            <div className="flex items-center justify-center py-8 text-slate-500 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Fetching routes…
            </div>
          )}

          {!loading && error && (
            <div className={`text-center ${routes.length > 0 ? 'py-2' : 'py-4'} space-y-2`}>
              <div className={`text-sm ${routes.length > 0 ? 'text-amber-600' : 'text-red-600'}`}>{error}</div>
              {routes.length === 0 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={fetchDirections}
                  >
                    Retry
                  </button>
                  <a
                    href={googleMapsDirectionsUrl(origin, destination, transportMode)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-xs inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Open in Google Maps
                  </a>
                </div>
              )}
            </div>
          )}

          {!loading && routes.map((route, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left card-hover p-3 space-y-2"
              onClick={() =>
                onSelect({
                  duration: route.duration,
                  distance: route.distance,
                  cost: route.fare?.amount,
                  routePolyline: route.polyline,
                })
              }
            >
              {/* Route header */}
              <div className="flex items-center gap-2">
                <Route className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                <span className="font-semibold text-xs truncate">
                  {route.summary || `Route ${i + 1}`}
                </span>
              </div>

              {/* Duration, distance, fare */}
              <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {route.duration}
                </span>
                <span className="flex items-center gap-1">
                  <Ruler className="w-3 h-3" /> {route.distance}
                </span>
                {route.fare && (
                  <span className="flex items-center gap-1 font-semibold text-green-600 dark:text-green-400">
                    <Banknote className="w-3 h-3" /> {route.fare.text}
                  </span>
                )}
              </div>

              {/* Transit steps breakdown */}
              {route.transitSteps && route.transitSteps.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  {route.transitSteps.map((step, j) => (
                    <span key={j} className="contents">
                      {j > 0 && <span className="text-slate-400 text-[10px]">›</span>}
                      <TransitStepBadge step={step} />
                    </span>
                  ))}
                </div>
              )}

              {/* Transit step details (expanded) */}
              {route.transitSteps && route.transitSteps.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                  {route.transitSteps.map((step, j) => (
                    <TransitStepDetail key={j} step={step} />
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
          <button className="btn-secondary w-full text-xs" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/** Compact badge showing vehicle emoji + line name */
function TransitStepBadge({ step }: { step: TransitStep }) {
  if (step.vehicleType === 'WALK') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
        🚶 {step.duration || 'Walk'}
      </span>
    );
  }

  const bgColor = step.lineColor || '#6b7280';
  const textColor = step.lineTextColor || '#ffffff';

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {step.vehicleEmoji} {step.lineName || step.vehicleLabel}
    </span>
  );
}

/** Detailed row for a single transit step */
function TransitStepDetail({ step }: { step: TransitStep }) {
  if (step.vehicleType === 'WALK') {
    return (
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <span>🚶</span>
        <span>Walk{step.duration ? ` · ${step.duration}` : ''}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span className="flex-shrink-0 mt-0.5">{step.vehicleEmoji}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {step.lineName || step.vehicleLabel}
          </span>
          {step.agencyName && (
            <span className="text-slate-400">· {step.agencyName}</span>
          )}
        </div>
        <div className="text-slate-500 dark:text-slate-400">
          {step.departureStop && step.arrivalStop && (
            <span>{step.departureStop} → {step.arrivalStop}</span>
          )}
          {step.stopCount && (
            <span> · {step.stopCount} stop{step.stopCount !== 1 ? 's' : ''}</span>
          )}
          {step.duration && <span> · {step.duration}</span>}
        </div>
      </div>
    </div>
  );
}

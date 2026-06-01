import { useState, useRef, useEffect } from 'react';
import { Search, Crosshair, Plus, LocateFixed } from 'lucide-react';
import { api } from '../api';

export type PlaceData = {
  name: string;
  address?: string;
  coordinates: { lat: number; lng: number };
};

export function AddPlaceForm({
  onAdd,
  disabled,
  searchPlaceholder = 'Search city or place…',
  namePlaceholder = 'Name',
  title = 'Add a place',
  allowMyLocation = true,
}: {
  onAdd: (place: PlaceData) => Promise<void>;
  disabled?: boolean;
  searchPlaceholder?: string;
  namePlaceholder?: string;
  title?: string;
  allowMyLocation?: boolean;
}) {
  const [mode, setMode] = useState<'search' | 'coords'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    { lat: number; lng: number; label: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [coordName, setCoordName] = useState('');
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [autocompleteReady, setAutocompleteReady] = useState(false);
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);
  const autocompleteInitRef = useRef(false);
  const onAddRef = useRef(onAdd);
  onAddRef.current = onAdd;

  // Set up Google Places Autocomplete using PlaceAutocompleteElement
  useEffect(() => {
    if (mode !== 'search') return;
    const container = autocompleteContainerRef.current;
    if (!container || autocompleteInitRef.current) return;

    async function init() {
      if (typeof google === 'undefined' || !google.maps) return false;

      autocompleteInitRef.current = true;

      try {
        const { PlaceAutocompleteElement } = (await google.maps.importLibrary('places')) as any;

        const acElement = new PlaceAutocompleteElement();
        container!.innerHTML = '';
        container!.appendChild(acElement);
        setAutocompleteReady(true);

        acElement.addEventListener('gmp-select', async ({ placePrediction }: any) => {
          if (!placePrediction) return;

          const place = placePrediction.toPlace();
          await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });

          const location = place.location;
          if (!location) return;

          const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
          const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
          const name = (typeof place.displayName === 'string' ? place.displayName : place.displayName?.text)
            || place.formattedAddress?.split(',')[0] || 'Unnamed';
          const address = place.formattedAddress || '';

          onAddRef.current({ name, address, coordinates: { lat, lng } }).catch(() => {});
        });
      } catch (e) {
        console.warn('[AddPlaceForm] PlaceAutocompleteElement failed, using geocode fallback:', e);
        autocompleteInitRef.current = false;
      }

      return true;
    }

    init();

    return () => {
      autocompleteInitRef.current = false;
    };
  }, [mode, searchPlaceholder]);

  const useMyLocation = async () => {
    setError('');
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported in this browser');
      return;
    }
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      );
      const la = pos.coords.latitude;
      const ln = pos.coords.longitude;
      let name = 'My location';
      let address = '';
      try {
        const label = await api.reverseGeocode(la, ln);
        if (label) {
          name = label.split(',')[0].trim() || name;
          address = label;
        }
      } catch {}
      await onAdd({ name, address, coordinates: { lat: la, lng: ln } });
    } catch (err: any) {
      const code = err?.code;
      if (code === 1) setError('Location permission denied');
      else if (code === 2) setError('Location unavailable');
      else if (code === 3) setError('Location request timed out');
      else setError(err?.message || 'Could not get your location');
    } finally {
      setLocating(false);
    }
  };

  const doSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!query.trim()) return;
    setSearching(true);
    try {
      const r = await api.geocode(query.trim());
      setResults(r);
      if (r.length === 0) setError('No results found');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const addResult = async (r: { lat: number; lng: number; label: string }) => {
    const name = r.label.split(',')[0].trim() || 'Unnamed';
    try {
      await onAdd({ name, address: r.label, coordinates: { lat: r.lat, lng: r.lng } });
      setResults([]);
      setQuery('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const addCoords = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (
      Number.isNaN(la) ||
      Number.isNaN(ln) ||
      la < -90 ||
      la > 90 ||
      ln < -180 ||
      ln > 180
    ) {
      setError('Enter valid lat (-90..90) and lng (-180..180)');
      return;
    }
    try {
      await onAdd({
        name: coordName.trim() || `(${la.toFixed(3)}, ${ln.toFixed(3)})`,
        coordinates: { lat: la, lng: ln },
      });
      setLat('');
      setLng('');
      setCoordName('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="card p-3">
      <div className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-200">
        {title}
      </div>
      {allowMyLocation && (
        <button
          type="button"
          className="btn-secondary w-full mb-2"
          onClick={useMyLocation}
          disabled={disabled || locating}
          title="Use this device's GPS to add a place here"
        >
          <LocateFixed className="w-4 h-4" />
          {locating ? 'Locating…' : 'Use my location'}
        </button>
      )}
      <div className="flex gap-1 mb-3">
        <button
          className={`flex-1 btn ${
            mode === 'search' ? 'btn-primary' : 'btn-secondary'
          }`}
          onClick={() => setMode('search')}
          type="button"
        >
          <Search className="w-4 h-4" /> Search
        </button>
        <button
          className={`flex-1 btn ${
            mode === 'coords' ? 'btn-primary' : 'btn-secondary'
          }`}
          onClick={() => setMode('coords')}
          type="button"
        >
          <Crosshair className="w-4 h-4" /> Coords
        </button>
      </div>

      {mode === 'search' ? (
        <>
          {/* Google Places Autocomplete */}
          <div ref={autocompleteContainerRef} className="place-autocomplete-wrapper mb-2" />
          {/* Manual geocode search as fallback when autocomplete is not available */}
          {!autocompleteReady && (
            <form onSubmit={doSearch} className="flex gap-1">
              <input
                className="input"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={disabled}
              />
              <button className="btn-primary" disabled={disabled || searching}>
                <Search className="w-4 h-4" />
              </button>
            </form>
          )}
          {results.length > 0 && (
            <ul className="mt-2 max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
              {results.map((r, i) => (
                <li
                  key={i}
                  className="text-xs p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                  onClick={() => addResult(r)}
                >
                  <span className="line-clamp-2">{r.label}</span>
                  <Plus className="w-3.5 h-3.5 flex-shrink-0 text-brand-600" />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <form onSubmit={addCoords} className="space-y-2">
          <input
            className="input"
            placeholder={namePlaceholder}
            value={coordName}
            onChange={(e) => setCoordName(e.target.value)}
            disabled={disabled}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              type="number"
              step="0.0001"
              placeholder="Latitude"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              disabled={disabled}
            />
            <input
              className="input"
              type="number"
              step="0.0001"
              placeholder="Longitude"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              disabled={disabled}
            />
          </div>
          <button className="btn-primary w-full" disabled={disabled}>
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
      )}
      {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
    </div>
  );
}

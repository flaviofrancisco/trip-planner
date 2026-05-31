import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Download,
  Languages,
  Settings as SettingsIcon,
  Map as MapIcon,
} from 'lucide-react';
import { api } from '../api';
import type { Trip, TransportMode } from '../types';
import { TripMap, type MapMarker, type MapLeg } from '../components/TripMap';
import { MapLegend } from '../components/MapLegend';
import { AddPlaceForm } from '../components/AddPlaceForm';
import { CitiesList } from '../components/CitiesList';
import { CityDetailPanel } from '../components/CityDetailPanel';
import { SharePanel } from '../components/SharePanel';
import { AIChatPanel } from '../components/AIChatPanel';
import { VoiceTranslator } from '../components/VoiceTranslator';
import { SettingsModal } from '../components/SettingsModal';
import { ExpensesPanel } from '../components/ExpensesPanel';
import { exportTripToXlsx } from '../utils/export';
import { CURRENCIES, formatMoney } from '../utils/currency';
import { useToast } from '../context/ToastContext';

export function TripPlannerPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCityId, setSelectedCityId] = useState<string>();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [showTranslator, setShowTranslator] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const load = async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const t = await api.getTrip(tripId);
      setTrip(t);
      setTitleDraft(t.title);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  if (loading) return <div className="p-8 text-slate-500">Loading trip…</div>;
  if (error)
    return (
      <div className="p-8 text-red-600">
        {error}{' '}
        <Link to="/" className="underline">
          Back
        </Link>
      </div>
    );
  if (!trip) return null;

  const canEdit = trip.permission === 'owner' || trip.permission === 'editor';
  const selectedCity = trip.cities.find((c) => c.id === selectedCityId);

  const addCity = async (place: { name: string; coordinates: { lat: number; lng: number } }) => {
    try {
      const updated = await api.addCity(trip.id, {
        name: place.name,
        coordinates: place.coordinates,
      });
      setTrip(updated);
      const newCity = updated.cities[updated.cities.length - 1];
      setSelectedCityId(newCity.id);
      toast.success(`City “${newCity.name}” added`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saveCity = async (cityId: string, patch: any) => {
    try {
      const updated = await api.updateCity(trip.id, cityId, patch);
      setTrip(updated);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteCity = async (cityId: string) => {
    try {
      const updated = await api.deleteCity(trip.id, cityId);
      setTrip(updated);
      setSelectedCityId(undefined);
      toast.success('City deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const setInterLeg = async (
    fromCityId: string,
    toCityId: string,
    patch: { transportMode?: TransportMode; cost?: number },
    existingLegId?: string
  ) => {
    try {
      if (existingLegId) {
        const updated = await api.updateInterLeg(trip.id, existingLegId, patch);
        setTrip(updated);
      } else if (patch.transportMode) {
        const updated = await api.setInterLeg(
          trip.id,
          fromCityId,
          toCityId,
          patch.transportMode,
          patch.cost
        );
        setTrip(updated);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saveTitle = async () => {
    if (!titleDraft.trim() || titleDraft === trip.title) {
      setEditingTitle(false);
      setTitleDraft(trip.title);
      return;
    }
    try {
      const updated = await api.updateTrip(trip.id, { title: titleDraft.trim() });
      setTrip({ ...trip, title: updated.title });
      setEditingTitle(false);
      toast.success('Trip renamed');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const changeCurrency = async (currency: string) => {
    try {
      const updated = await api.updateTrip(trip.id, { currency });
      setTrip(updated);
      toast.success(`Currency set to ${currency}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Map data
  const markers: MapMarker[] = trip.cities.map((c) => ({
    id: c.id,
    lat: c.coordinates.lat,
    lng: c.coordinates.lng,
    number: c.cityNumber,
    label: c.name,
    variant: 'city',
  }));
  const legs: MapLeg[] = trip.legs.map((l) => ({
    id: l.id,
    fromId: l.fromCityId,
    toId: l.toCityId,
    transportMode: l.transportMode,
  }));

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="max-w-7xl w-full mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button className="btn-ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          {editingTitle ? (
            <input
              className="input text-lg font-bold"
              value={titleDraft}
              autoFocus
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') {
                  setEditingTitle(false);
                  setTitleDraft(trip.title);
                }
              }}
            />
          ) : (
            <h1 className="text-lg font-bold truncate flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-brand-600" />
              {trip.title}
            </h1>
          )}
          {canEdit && !editingTitle && (
            <button
              className="btn-ghost"
              onClick={() => setEditingTitle(true)}
              title="Rename"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="pill capitalize">{trip.permission}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="btn-secondary"
            onClick={() => setShowTranslator(true)}
            title="Voice translator"
          >
            <Languages className="w-4 h-4" /> Translate
          </button>
          <button
            className="btn-secondary"
            onClick={() => exportTripToXlsx(trip)}
            disabled={trip.cities.length === 0}
            title="Download as Excel"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
          <select
            className="input py-1 text-xs w-auto"
            value={trip.currency || 'EUR'}
            disabled={!canEdit}
            onChange={(e) => changeCurrency(e.target.value)}
            title="Trip currency"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.label}
              </option>
            ))}
          </select>
          <div className="text-sm">
            <span className="text-slate-500">Total: </span>
            <span className="font-bold text-brand-600">
              {formatMoney(trip.totalCost, trip.currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid lg:grid-cols-[340px_1fr_360px] grid-rows-[auto_1fr] lg:grid-rows-1 min-h-0">
        <aside className="border-r border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-3 overflow-y-auto scrollbar-thin max-h-[42vh] lg:max-h-none lg:h-full space-y-3">
          {canEdit && (
            <AddPlaceForm
              title="Add a city"
              searchPlaceholder="City name (e.g. Tokyo)"
              namePlaceholder="City name"
              onAdd={(p) => addCity(p)}
            />
          )}
          <CitiesList
            trip={trip}
            canEdit={canEdit}
            selectedCityId={selectedCityId}
            onSelectCity={setSelectedCityId}
            onChangeInterLeg={setInterLeg}
            onReorder={async (order) => {
              try {
                const updated = await api.reorderCities(trip.id, order);
                setTrip(updated);
                toast.success('Cities reordered');
              } catch (e: any) {
                toast.error(e.message);
              }
            }}
          />
        </aside>

        <section className="relative min-h-[40vh] lg:min-h-0">
          <TripMap
            markers={markers}
            legs={legs}
            selectedMarkerId={selectedCityId}
            onSelectMarker={setSelectedCityId}
          />
          <div className="absolute bottom-3 left-3 z-[400] max-w-[220px]">
            <MapLegend />
          </div>
        </section>

        <aside className="border-l border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-3 overflow-y-auto scrollbar-thin max-h-[60vh] lg:max-h-none lg:h-full space-y-3">
          {selectedCity ? (
            <CityDetailPanel
              key={selectedCity.id}
              tripId={trip.id}
              city={selectedCity}
              canEdit={canEdit}
              onSave={(patch) => saveCity(selectedCity.id, patch)}
              onDelete={() => deleteCity(selectedCity.id)}
              onClose={() => setSelectedCityId(undefined)}
            />
          ) : (
            <div className="card p-4 text-sm text-slate-500">
              Select a city to see its details, or click <em>Open</em> on a city to plan its attractions.
            </div>
          )}
          <ExpensesPanel
            title="Trip expenses"
            expenses={trip.expenses || []}
            currency={trip.currency || 'EUR'}
            canEdit={canEdit}
            onAdd={async (data) => {
              const updated = await api.addExpense(trip.id, data);
              setTrip(updated);
            }}
            onUpdate={async (id, data) => {
              const updated = await api.updateExpense(trip.id, id, data);
              setTrip(updated);
            }}
            onDelete={async (id) => {
              const updated = await api.deleteExpense(trip.id, id);
              setTrip(updated);
            }}
          />
          {canEdit && (
            <AIChatPanel
              trip={trip}
              onTripUpdated={setTrip}
              onOpenSettings={() => setShowSettings(true)}
            />
          )}
          {trip.permission === 'owner' && (
            <SharePanel trip={trip} onChange={setTrip} />
          )}
          <button
            className="btn-ghost w-full text-xs"
            onClick={() => setShowSettings(true)}
          >
            <SettingsIcon className="w-3.5 h-3.5" /> Manage API keys
          </button>
        </aside>
      </div>

      {showTranslator && (
        <VoiceTranslator
          onClose={() => setShowTranslator(false)}
          onOpenSettings={() => {
            setShowTranslator(false);
            setShowSettings(true);
          }}
        />
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import { api } from '../api';
import type { Attraction, City, TransportMode, Trip } from '../types';
import { TripMap, type MapMarker, type MapLeg } from '../components/TripMap';
import { MapLegend } from '../components/MapLegend';
import { AddPlaceForm } from '../components/AddPlaceForm';
import { AttractionsList } from '../components/AttractionsList';
import { RoutesList, type RouteStop } from '../components/RoutesList';
import { TabbedPanel } from '../components/TabbedPanel';
import { PoiPanel } from '../components/PoiPanel';
import { ExpensesPanel } from '../components/ExpensesPanel';
import { formatMoney } from '../utils/currency';
import { formatVisitAt } from '../utils/date';
import { attractionEmoji } from '../constants';
import { useToast } from '../context/ToastContext';

export function CityPlannerPage() {
  const { tripId, cityId } = useParams<{ tripId: string; cityId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAttractionId, setSelectedAttractionId] = useState<string>();

  const load = async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const t = await api.getTrip(tripId);
      setTrip(t);
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

  if (loading) return <div className="p-8 text-slate-500">Loading…</div>;
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

  const city: City | undefined = trip.cities.find((c) => c.id === cityId);
  if (!city)
    return (
      <div className="p-8 text-slate-500">
        City not found.{' '}
        <Link to={`/trips/${trip.id}`} className="underline">
          Back to trip
        </Link>
      </div>
    );

  const canEdit = trip.permission === 'owner' || trip.permission === 'editor';
  const currency = trip.currency || 'EUR';
  const selected = city.attractions.find((a) => a.id === selectedAttractionId);

  const cityCost =
    city.attractions.reduce(
      (s, a) => s + (a.isFree ? 0 : Number(a.cost) || 0),
      0
    ) + city.legs.reduce((s, l) => s + (Number(l.cost) || 0), 0);

  const addAttraction = async (place: {
    name: string;
    address?: string;
    coordinates: { lat: number; lng: number };
  }) => {
    try {
      const updated = await api.addAttraction(trip.id, city.id, {
        poiName: place.name,
        address: place.address,
        coordinates: place.coordinates,
      });
      setTrip(updated);
      const newCity = updated.cities.find((c) => c.id === city.id);
      const newAttraction = newCity?.attractions[newCity.attractions.length - 1];
      if (newAttraction) setSelectedAttractionId(newAttraction.id);
      toast.success(`Attraction “${place.name}” added`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const updateAttraction = async (
    attractionId: string,
    patch: Partial<Attraction>
  ) => {
    try {
      const updated = await api.updateAttraction(
        trip.id,
        city.id,
        attractionId,
        patch
      );
      setTrip(updated);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteAttraction = async (attractionId: string) => {
    try {
      const updated = await api.deleteAttraction(trip.id, city.id, attractionId);
      setTrip(updated);
      setSelectedAttractionId(undefined);
      toast.success('Attraction deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const createIntraLeg = async (
    fromAttractionId: string,
    toAttractionId: string,
    transportMode: TransportMode,
    cost?: number
  ) => {
    try {
      const updated = await api.setIntraLeg(
        trip.id,
        city.id,
        fromAttractionId,
        toAttractionId,
        transportMode,
        cost
      );
      setTrip(updated);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const updateIntraLeg = async (
    legId: string,
    patch: { transportMode?: TransportMode; cost?: number; duration?: string | null; distance?: string | null; routePolyline?: string | null }
  ) => {
    try {
      const updated = await api.updateIntraLeg(trip.id, city.id, legId, patch);
      setTrip(updated);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteIntraLeg = async (legId: string) => {
    try {
      const updated = await api.deleteIntraLeg(trip.id, city.id, legId);
      setTrip(updated);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Map data
  const markers: MapMarker[] = city.attractions.map((a) => ({
    id: a.id,
    lat: a.coordinates.lat,
    lng: a.coordinates.lng,
    number: a.attractionNumber,
    label: a.poiName,
    emoji: attractionEmoji(a.attractionTypeIcon),
    variant: 'attraction',
  }));
  const legs: MapLeg[] = city.legs.map((l) => ({
    id: l.id,
    fromId: l.fromAttractionId,
    toId: l.toAttractionId,
    transportMode: l.transportMode,
    routePolyline: l.routePolyline,
  }));

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="max-w-7xl w-full mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            className="btn-ghost"
            onClick={() => navigate(`/trips/${trip.id}`)}
            title="Back to trip"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link
              to={`/trips/${trip.id}`}
              className="hover:underline truncate max-w-[140px]"
            >
              {trip.title}
            </Link>
            <span>›</span>
          </div>
          <div className="city-marker !static">
            <span className="num">{city.cityNumber}</span>
          </div>
          <h1 className="text-lg font-bold truncate">{city.name}</h1>
          {(city.startDate || city.endDate) && (
            <span className="pill flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatVisitAt(city.startDate)}
              {city.endDate ? ` → ${formatVisitAt(city.endDate)}` : ''}
            </span>
          )}
          <span className="pill flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {city.attractions.length} attraction
            {city.attractions.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="text-sm">
          <span className="text-slate-500">City cost: </span>
          <span className="font-bold text-brand-600">
            {formatMoney(cityCost, currency)}
          </span>
        </div>
      </div>

      <div className="flex-1 grid lg:grid-cols-[340px_1fr_360px] grid-rows-[auto_1fr] lg:grid-rows-1 min-h-0">
        <aside className="border-r border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-3 overflow-y-auto scrollbar-thin max-h-[42vh] lg:max-h-none lg:h-full space-y-3">
          {canEdit && (
            <AddPlaceForm
              title={`Add attraction to ${city.name}`}
              searchPlaceholder="Attraction name…"
              namePlaceholder="Attraction name"
              onAdd={(p) => addAttraction(p)}
            />
          )}
          <TabbedPanel
            tabs={[
              {
                key: 'attractions',
                label: 'Attractions',
                badge: city.attractions.length,
                content: (
                  <AttractionsList
                    trip={trip}
                    city={city}
                    canEdit={canEdit}
                    selectedAttractionId={selectedAttractionId}
                    onSelectAttraction={setSelectedAttractionId}
                    onReorder={async (order) => {
                      try {
                        const updated = await api.reorderAttractions(
                          trip.id,
                          city.id,
                          order
                        );
                        setTrip(updated);
                        toast.success('Attractions reordered');
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                  />
                ),
              },
              {
                key: 'routes',
                label: 'Routes',
                badge: city.legs.length,
                content: (
                  <RoutesList
                    emptyHint="No routes yet. Add one to plan how you'll move between attractions."
                    stops={city.attractions.map<RouteStop>((a) => ({
                      id: a.id,
                      number: a.attractionNumber,
                      label: a.poiName,
                      lat: a.coordinates.lat,
                      lng: a.coordinates.lng,
                    }))}
                    routes={city.legs.map((l) => ({
                      id: l.id,
                      fromId: l.fromAttractionId,
                      toId: l.toAttractionId,
                      transportMode: l.transportMode,
                      cost: l.cost,
                      duration: l.duration,
                      distance: l.distance,
                      routePolyline: l.routePolyline,
                    }))}
                    canEdit={canEdit}
                    currency={currency}
                    onCreate={createIntraLeg}
                    onUpdate={updateIntraLeg}
                    onDelete={deleteIntraLeg}
                  />
                ),
              },
            ]}
          />
        </aside>

        <section className="relative min-h-[40vh] lg:min-h-0">
          <TripMap
            markers={markers}
            legs={legs}
            selectedMarkerId={selectedAttractionId}
            onSelectMarker={setSelectedAttractionId}
            onMapDoubleClick={canEdit ? addAttraction : undefined}
            defaultCenter={[city.coordinates.lat, city.coordinates.lng]}
            defaultZoom={12}
          />
          <div className="absolute bottom-3 left-3 z-[400] max-w-[220px]">
            <MapLegend />
          </div>
        </section>

        <aside className="border-l border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-3 overflow-y-auto scrollbar-thin max-h-[60vh] lg:max-h-none lg:h-full space-y-3">
          {selected ? (
            <PoiPanel
              key={selected.id}
              attraction={selected}
              canEdit={canEdit}
              currency={currency}
              onSave={(patch) => updateAttraction(selected.id, patch)}
              onDelete={() => deleteAttraction(selected.id)}
              onClose={() => setSelectedAttractionId(undefined)}
            />
          ) : (
            <div className="card p-4 text-sm text-slate-500">
              Select an attraction on the map or in the list to see its details.
            </div>
          )}
          <ExpensesPanel
            title={`Expenses in ${city.name}`}
            emptyHint="No expenses logged for this city yet."
            expenses={city.expenses || []}
            currency={currency}
            canEdit={canEdit}
            onAdd={async (data) => {
              const updated = await api.addCityExpense(trip.id, city.id, data);
              setTrip(updated);
            }}
            onUpdate={async (id, data) => {
              const updated = await api.updateCityExpense(
                trip.id,
                city.id,
                id,
                data
              );
              setTrip(updated);
            }}
            onDelete={async (id) => {
              const updated = await api.deleteCityExpense(
                trip.id,
                city.id,
                id
              );
              setTrip(updated);
            }}
          />
        </aside>
      </div>
    </div>
  );
}

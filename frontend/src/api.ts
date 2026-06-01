import type {
  Attraction,
  Trip,
  TripSummary,
  TransportMode,
  AttractionIcon,
  ReservationIcon,
  ExpenseCategory,
  User,
  AIProvider,
} from './types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const TOKEN_KEY = 'tp_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {}
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  signup: (email: string, name: string, password: string) =>
    request<{ token: string; user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, name, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>('/users/me'),
  updateMe: (data: {
    name?: string;
    preferences?: { theme?: 'light' | 'dark' | 'system' };
    apiKeys?: { openai?: string; gemini?: string };
  }) =>
    request<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Trips
  listTrips: () => request<TripSummary[]>('/trips'),
  createTrip: (title: string) =>
    request<Trip>('/trips', { method: 'POST', body: JSON.stringify({ title }) }),
  getTrip: (tripId: string) => request<Trip>(`/trips/${tripId}`),
  updateTrip: (
    tripId: string,
    data: { title?: string; currency?: string }
  ) =>
    request<Trip>(`/trips/${tripId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteTrip: (tripId: string) =>
    request<void>(`/trips/${tripId}`, { method: 'DELETE' }),

  // Cities
  addCity: (
    tripId: string,
    data: {
      name: string;
      coordinates: { lat: number; lng: number };
      notes?: string;
      startDate?: string | null;
      endDate?: string | null;
    }
  ) =>
    request<Trip>(`/trips/${tripId}/cities`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCity: (
    tripId: string,
    cityId: string,
    data: {
      name?: string;
      coordinates?: { lat: number; lng: number };
      notes?: string;
      startDate?: string | null;
      endDate?: string | null;
    }
  ) =>
    request<Trip>(`/trips/${tripId}/cities/${cityId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteCity: (tripId: string, cityId: string) =>
    request<Trip>(`/trips/${tripId}/cities/${cityId}`, { method: 'DELETE' }),
  reorderCities: (tripId: string, order: string[]) =>
    request<Trip>(`/trips/${tripId}/cities/reorder`, {
      method: 'POST',
      body: JSON.stringify({ order }),
    }),
  reorderAttractions: (tripId: string, cityId: string, order: string[]) =>
    request<Trip>(
      `/trips/${tripId}/cities/${cityId}/attractions/reorder`,
      { method: 'POST', body: JSON.stringify({ order }) }
    ),

  // Attractions
  addAttraction: (
    tripId: string,
    cityId: string,
    data: {
      poiName: string;
      address?: string;
      coordinates: { lat: number; lng: number };
      notes?: string;
      cost?: number;
      isFree?: boolean;
      rating?: number;
      attractionTypeIcon?: AttractionIcon;
      reservationIcon?: ReservationIcon;
      visitAt?: string | null;
    }
  ) =>
    request<Trip>(`/trips/${tripId}/cities/${cityId}/attractions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAttraction: (
    tripId: string,
    cityId: string,
    attractionId: string,
    data: Partial<Attraction>
  ) =>
    request<Trip>(
      `/trips/${tripId}/cities/${cityId}/attractions/${attractionId}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    ),
  deleteAttraction: (tripId: string, cityId: string, attractionId: string) =>
    request<Trip>(
      `/trips/${tripId}/cities/${cityId}/attractions/${attractionId}`,
      { method: 'DELETE' }
    ),

  // Intra-city legs
  setIntraLeg: (
    tripId: string,
    cityId: string,
    fromAttractionId: string,
    toAttractionId: string,
    transportMode: TransportMode,
    cost?: number
  ) =>
    request<Trip>(`/trips/${tripId}/cities/${cityId}/legs`, {
      method: 'POST',
      body: JSON.stringify({
        fromAttractionId,
        toAttractionId,
        transportMode,
        cost,
      }),
    }),
  updateIntraLeg: (
    tripId: string,
    cityId: string,
    legId: string,
    patch: { transportMode?: TransportMode; cost?: number; duration?: string | null; distance?: string | null; routePolyline?: string | null }
  ) =>
    request<Trip>(`/trips/${tripId}/cities/${cityId}/legs/${legId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deleteIntraLeg: (tripId: string, cityId: string, legId: string) =>
    request<Trip>(`/trips/${tripId}/cities/${cityId}/legs/${legId}`, {
      method: 'DELETE',
    }),

  // Inter-city legs
  setInterLeg: (
    tripId: string,
    fromCityId: string,
    toCityId: string,
    transportMode: TransportMode,
    cost?: number
  ) =>
    request<Trip>(`/trips/${tripId}/legs`, {
      method: 'POST',
      body: JSON.stringify({ fromCityId, toCityId, transportMode, cost }),
    }),
  updateInterLeg: (
    tripId: string,
    legId: string,
    patch: { transportMode?: TransportMode; cost?: number; duration?: string | null; distance?: string | null; routePolyline?: string | null }
  ) =>
    request<Trip>(`/trips/${tripId}/legs/${legId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deleteInterLeg: (tripId: string, legId: string) =>
    request<Trip>(`/trips/${tripId}/legs/${legId}`, {
      method: 'DELETE',
    }),

  // Expenses
  addExpense: (
    tripId: string,
    data: {
      description?: string;
      category?: ExpenseCategory;
      cost?: number;
      date?: string | null;
    }
  ) =>
    request<Trip>(`/trips/${tripId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateExpense: (
    tripId: string,
    expenseId: string,
    data: {
      description?: string;
      category?: ExpenseCategory;
      cost?: number;
      date?: string | null;
    }
  ) =>
    request<Trip>(`/trips/${tripId}/expenses/${expenseId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteExpense: (tripId: string, expenseId: string) =>
    request<Trip>(`/trips/${tripId}/expenses/${expenseId}`, {
      method: 'DELETE',
    }),

  // City-level expenses
  addCityExpense: (
    tripId: string,
    cityId: string,
    data: {
      description?: string;
      category?: ExpenseCategory;
      cost?: number;
      date?: string | null;
    }
  ) =>
    request<Trip>(`/trips/${tripId}/cities/${cityId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCityExpense: (
    tripId: string,
    cityId: string,
    expenseId: string,
    data: {
      description?: string;
      category?: ExpenseCategory;
      cost?: number;
      date?: string | null;
    }
  ) =>
    request<Trip>(
      `/trips/${tripId}/cities/${cityId}/expenses/${expenseId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    ),
  deleteCityExpense: (tripId: string, cityId: string, expenseId: string) =>
    request<Trip>(
      `/trips/${tripId}/cities/${cityId}/expenses/${expenseId}`,
      { method: 'DELETE' }
    ),

  // Sharing
  shareTrip: (tripId: string, email: string, permission: 'viewer' | 'editor') =>
    request<Trip>(`/trips/${tripId}/share`, {
      method: 'POST',
      body: JSON.stringify({ email, permission }),
    }),
  unshareTrip: (tripId: string, userId: string) =>
    request<Trip>(`/trips/${tripId}/share/${userId}`, { method: 'DELETE' }),

  // Geocoding (Google Geocoding API)
  geocode: async (query: string) => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        query
      )}&key=${key}`
    );
    if (!res.ok) throw new Error('Geocoding failed');
    const data = (await res.json()) as {
      status: string;
      results: Array<{
        geometry: { location: { lat: number; lng: number } };
        formatted_address: string;
      }>;
    };
    if (data.status !== 'OK' || data.results.length === 0) return [];
    return data.results.slice(0, 5).map((r) => ({
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
      label: r.formatted_address,
    }));
  },
  reverseGeocode: async (lat: number, lng: number) => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status: string;
      results: Array<{ formatted_address: string }>;
    };
    if (data.status !== 'OK' || data.results.length === 0) return null;
    return data.results[0].formatted_address;
  },

  // AI
  aiChat: (
    tripId: string,
    provider: AIProvider,
    messages: { role: 'user' | 'assistant'; content: string }[],
    model?: string
  ) =>
    request<{
      reply: string;
      toolCalls: { name: string; args: any; result: any; error?: string }[];
      trip: Trip;
    }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ tripId, provider, messages, model }),
    }),
  aiTranslate: (
    provider: AIProvider,
    text: string,
    sourceLang: string,
    targetLang: string,
    model?: string
  ) =>
    request<{ translated: string }>('/ai/translate', {
      method: 'POST',
      body: JSON.stringify({ provider, text, sourceLang, targetLang, model }),
    }),
  aiOptimize: (tripId: string) =>
    request<Trip>(`/ai/optimize/${tripId}`, { method: 'POST' }),

  // Directions
  getDirections: (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    transportMode: string
  ) =>
    request<{
      routes: Array<{
        summary: string;
        duration: string;
        durationValue: number;
        distance: string;
        distanceValue: number;
        fare?: { amount: number; currency: string; text: string };
        polyline: string;
        transitSteps?: Array<{
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
        }>;
      }>;
      message?: string;
    }>(
      `/directions?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&transportMode=${transportMode}`
    ),
};

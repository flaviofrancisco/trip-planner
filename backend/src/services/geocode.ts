export async function geocode(query: string) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY is not set');

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    query
  )}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding failed');

  const data = (await res.json()) as {
    status: string;
    results: Array<{
      geometry: { location: { lat: number; lng: number } };
      formatted_address: string;
    }>;
  };
  if (data.status !== 'OK' || data.results.length === 0) return null;
  const r = data.results[0];
  return {
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    label: r.formatted_address,
  };
}

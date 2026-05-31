export async function geocode(query: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    query
  )}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'trip-planner/1.0 (https://example.local)',
    },
  });
  if (!res.ok) throw new Error('Geocoding failed');
  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  if (data.length === 0) return null;
  const r = data[0];
  return { lat: Number(r.lat), lng: Number(r.lon), label: r.display_name };
}

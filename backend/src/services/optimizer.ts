import { Types } from 'mongoose';

interface PointLike {
  _id: Types.ObjectId | string;
  coordinates: { lat: number; lng: number };
}

function haversineKm(a: PointLike['coordinates'], b: PointLike['coordinates']) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

/** Nearest-neighbor tour starting from the first step (kept fixed). */
export function nearestNeighborOrder<T extends PointLike>(steps: T[]): string[] {
  if (steps.length <= 2) return steps.map((s) => s._id.toString());
  const ids = steps.map((s) => s._id.toString());
  const remaining = new Set(ids.slice(1));
  const order = [ids[0]];
  let currentId = ids[0];
  const byId = new Map(steps.map((s) => [s._id.toString(), s]));
  while (remaining.size > 0) {
    const cur = byId.get(currentId)!;
    let best: string | null = null;
    let bestD = Infinity;
    for (const id of remaining) {
      const d = haversineKm(cur.coordinates, byId.get(id)!.coordinates);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    order.push(best!);
    remaining.delete(best!);
    currentId = best!;
  }
  return order;
}

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// Google Routes API travel modes
const MODE_MAP: Record<string, string> = {
  foot: 'WALK',
  taxi: 'DRIVE',
  car: 'DRIVE',
  motorcycle: 'TWO_WHEELER',
  bicycle: 'BICYCLE',
  bus: 'TRANSIT',
  train: 'TRANSIT',
  metro: 'TRANSIT',
  ferry: 'TRANSIT',
  transit: 'TRANSIT',
  tram: 'TRANSIT',
  cablecar: 'TRANSIT',
  funicular: 'TRANSIT',
};

// Map Google vehicle types to our display info
const VEHICLE_ICONS: Record<string, { emoji: string; label: string }> = {
  BUS: { emoji: '🚌', label: 'Bus' },
  HEAVY_RAIL: { emoji: '🚆', label: 'Train' },
  HIGH_SPEED_TRAIN: { emoji: '🚅', label: 'High-Speed Train' },
  INTERCITY_BUS: { emoji: '🚌', label: 'Intercity Bus' },
  LONG_DISTANCE_TRAIN: { emoji: '🚆', label: 'Long Distance Train' },
  METRO_RAIL: { emoji: '🚇', label: 'Metro' },
  RAIL: { emoji: '🚆', label: 'Rail' },
  SUBWAY: { emoji: '🚇', label: 'Subway' },
  TRAM: { emoji: '🚊', label: 'Tram' },
  COMMUTER_TRAIN: { emoji: '🚆', label: 'Commuter Train' },
  FERRY: { emoji: '⛴️', label: 'Ferry' },
  CABLE_CAR: { emoji: '🚡', label: 'Cable Car' },
  FUNICULAR: { emoji: '🚞', label: 'Funicular' },
  GONDOLA_LIFT: { emoji: '🚡', label: 'Gondola' },
  MONORAIL: { emoji: '🚝', label: 'Monorail' },
  SHARE_TAXI: { emoji: '🚐', label: 'Shared Taxi' },
  OTHER: { emoji: '🚏', label: 'Transit' },
};

router.get('/', async (req, res, next) => {
  try {
    const { origin, destination, transportMode } = req.query;
    if (!origin || !destination || !transportMode) {
      return res.status(400).json({ error: 'origin, destination, and transportMode are required' });
    }

    const modeStr = String(transportMode);
    if (modeStr === 'plane') {
      return res.json({ routes: [], message: 'Directions not available for flights' });
    }

    const travelMode = MODE_MAP[modeStr];
    if (!travelMode) {
      return res.status(400).json({ error: `Unsupported transport mode: ${modeStr}` });
    }

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      return res.status(500).json({ error: 'GOOGLE_MAPS_API_KEY is not configured' });
    }

    // Parse "lat,lng" strings
    const [oLat, oLng] = String(origin).split(',').map(Number);
    const [dLat, dLng] = String(destination).split(',').map(Number);

    const isTransit = travelMode === 'TRANSIT';

    const body: any = {
      origin: {
        location: { latLng: { latitude: oLat, longitude: oLng } },
      },
      destination: {
        location: { latLng: { latitude: dLat, longitude: dLng } },
      },
      travelMode,
      computeAlternativeRoutes: true,
    };

    if (isTransit) {
      // Transit requires a departure time; does not support alternativeRoutes or routeModifiers
      body.departureTime = new Date(Date.now() + 5 * 60_000).toISOString();
      delete body.computeAlternativeRoutes;
    } else {
      body.routeModifiers = {};
    }

    // Routes API uses a field mask — certain fields are only valid for specific travel modes
    const commonFields = [
      'routes.distanceMeters',
      'routes.duration',
      'routes.polyline.encodedPolyline',
      'routes.localizedValues',
      'routes.legs.duration',
      'routes.legs.distanceMeters',
      'routes.legs.localizedValues',
    ];

    const transitFields = [
      'routes.legs.steps.transitDetails',
      'routes.legs.steps.travelMode',
      'routes.legs.steps.localizedValues',
    ];

    const nonTransitFields = [
      'routes.description',
      'routes.travelAdvisory',
    ];

    const fieldMask = [
      ...commonFields,
      ...(isTransit ? transitFields : nonTransitFields),
    ].join(',');

    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': fieldMask,
    };

    const payload = JSON.stringify(body);

    // Retry with exponential backoff for transient errors (rate limits, temporary blocks)
    let gData: any;
    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const gRes = await fetch(url, { method: 'POST', headers, body: payload });
      gData = await gRes.json();

      const status = gData.error?.status;
      const code = gData.error?.code;
      const isTransient = status === 'REQUEST_DENIED'
        || status === 'RESOURCE_EXHAUSTED'
        || code === 429
        || code === 503;

      if (!gData.error || !isTransient || attempt === MAX_RETRIES) break;

      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
    }

    if (gData.error) {
      console.error('[Directions] Routes API error:', JSON.stringify(gData.error, null, 2));
      return res.json({ routes: [], message: gData.error.message || 'Routes API error' });
    }

    if (!gData.routes || gData.routes.length === 0) {
      // Transit coverage via the Routes API is region-limited — notably, Japanese
      // rail/transit is not served, even though the consumer Maps site shows it.
      const message = isTransit
        ? 'Transit directions are not available for this route. Google\'s public transit API has limited regional coverage — some areas (e.g. Japan) are not supported. Use the link below to check Google Maps directly.'
        : 'No routes found';
      return res.json({ routes: [], message });
    }

    const routes = gData.routes.map((r: any) => {
      const leg = r.legs?.[0];
      // Duration comes as "123s" string
      const durationSec = parseInt(r.duration) || 0;
      const distanceM = r.distanceMeters || 0;

      // Use localized values if available, otherwise format manually
      const durationText = r.localizedValues?.duration?.text
        || leg?.localizedValues?.duration?.text
        || formatDuration(durationSec);
      const distanceText = r.localizedValues?.distance?.text
        || leg?.localizedValues?.distance?.text
        || formatDistance(distanceM);

      // Check for toll/fare info in travel advisory
      const fare = r.travelAdvisory?.tollInfo?.estimatedPrice?.[0];

      // Extract transit steps with line/vehicle details
      const transitSteps: any[] = [];
      if (isTransit && leg?.steps) {
        for (const step of leg.steps) {
          if (step.travelMode === 'TRANSIT' && step.transitDetails) {
            const td = step.transitDetails;
            const line = td.transitLine || {};
            const vehicle = line.vehicle || {};
            const vehicleType = vehicle.type || 'OTHER';
            const vehicleInfo = VEHICLE_ICONS[vehicleType] || VEHICLE_ICONS.OTHER;

            transitSteps.push({
              vehicleType,
              vehicleEmoji: vehicleInfo.emoji,
              vehicleLabel: vehicleInfo.label,
              lineName: line.nameShort || line.name || '',
              lineColor: line.color || null,
              lineTextColor: line.textColor || null,
              agencyName: line.agencies?.[0]?.name || '',
              stopCount: td.stopCount || null,
              departureStop: td.stopDetails?.departureStop?.name || '',
              arrivalStop: td.stopDetails?.arrivalStop?.name || '',
              duration: step.localizedValues?.staticDuration?.text || null,
            });
          } else if (step.travelMode === 'WALK') {
            const walkDur = step.localizedValues?.staticDuration?.text;
            if (walkDur) {
              transitSteps.push({
                vehicleType: 'WALK',
                vehicleEmoji: '🚶',
                vehicleLabel: 'Walk',
                lineName: '',
                lineColor: null,
                lineTextColor: null,
                agencyName: '',
                stopCount: null,
                departureStop: '',
                arrivalStop: '',
                duration: walkDur,
              });
            }
          }
        }
      }

      // Build a richer summary for transit routes from the transit steps
      let summary = r.description || '';
      if (!summary && transitSteps.length > 0) {
        summary = transitSteps
          .filter((s) => s.vehicleType !== 'WALK')
          .map((s) => `${s.vehicleEmoji} ${s.lineName || s.vehicleLabel}`)
          .join(' → ');
      }

      // Collect fare from transit details if available
      let transitFare = fare
        ? { amount: parseFloat(fare.units || '0'), currency: fare.currencyCode, text: `${fare.units} ${fare.currencyCode}` }
        : undefined;

      return {
        summary,
        duration: durationText,
        durationValue: durationSec,
        distance: distanceText,
        distanceValue: distanceM,
        fare: transitFare,
        polyline: r.polyline?.encodedPolyline || '',
        transitSteps: transitSteps.length > 0 ? transitSteps : undefined,
      };
    });

    res.json({ routes });
  } catch (err) {
    next(err);
  }
});

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs} hr ${remainMins} min` : `${hrs} hr`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export default router;

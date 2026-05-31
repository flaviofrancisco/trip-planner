import { Types } from 'mongoose';
import {
  Trip,
  TRANSPORT_MODES,
  ATTRACTION_ICONS,
  RESERVATION_ICONS,
  EXPENSE_CATEGORIES,
} from '../models/Trip';
import { geocode } from './geocode';
import { nearestNeighborOrder } from './optimizer';

export interface ToolDef {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export const TRIP_TOOLS: ToolDef[] = [
  {
    name: 'list_trip',
    description:
      'Read the entire trip structure: cities (with their attractions and intra-city legs), inter-city legs, and expenses. Use this to discover ids before making changes.',
    parameters: { type: 'object', properties: {} },
  },
  // --- Cities ---
  {
    name: 'add_city',
    description:
      'Add a new city to the trip by geocoding a place name (e.g. "Tokyo, Japan").',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'City name to geocode.' },
        name: { type: 'string', description: 'Optional display name override.' },
        startDate: {
          type: 'string',
          description: 'Optional arrival date (YYYY-MM-DD).',
        },
        endDate: {
          type: 'string',
          description: 'Optional departure date (YYYY-MM-DD).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'update_city',
    description: 'Update a city by id.',
    parameters: {
      type: 'object',
      properties: {
        cityId: { type: 'string' },
        name: { type: 'string' },
        notes: { type: 'string' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
      },
      required: ['cityId'],
    },
  },
  {
    name: 'delete_city',
    description: 'Remove a city (and all its attractions and intra-city legs).',
    parameters: {
      type: 'object',
      properties: { cityId: { type: 'string' } },
      required: ['cityId'],
    },
  },
  {
    name: 'reorder_cities',
    description: 'Reorder cities. Pass a full list of cityIds in the new order.',
    parameters: {
      type: 'object',
      properties: { order: { type: 'array', items: { type: 'string' } } },
      required: ['order'],
    },
  },
  {
    name: 'optimize_cities',
    description:
      'Reorder cities with a nearest-neighbor heuristic starting from the current first city.',
    parameters: { type: 'object', properties: {} },
  },
  // --- Attractions ---
  {
    name: 'add_attraction_by_city',
    description:
      'Add a new attraction to a city by geocoding a place name (e.g. "Senso-ji").',
    parameters: {
      type: 'object',
      properties: {
        cityId: { type: 'string' },
        query: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['cityId', 'query'],
    },
  },
  {
    name: 'add_attraction_by_coords',
    description: 'Add a new attraction to a city at exact coordinates.',
    parameters: {
      type: 'object',
      properties: {
        cityId: { type: 'string' },
        name: { type: 'string' },
        lat: { type: 'number' },
        lng: { type: 'number' },
      },
      required: ['cityId', 'name', 'lat', 'lng'],
    },
  },
  {
    name: 'update_attraction',
    description: 'Update fields on an existing attraction.',
    parameters: {
      type: 'object',
      properties: {
        cityId: { type: 'string' },
        attractionId: { type: 'string' },
        poiName: { type: 'string' },
        notes: { type: 'string' },
        cost: { type: 'number' },
        isFree: { type: 'boolean' },
        rating: { type: 'number', minimum: 0, maximum: 5 },
        attractionTypeIcon: { type: 'string', enum: [...ATTRACTION_ICONS] },
        reservationIcon: { type: 'string', enum: [...RESERVATION_ICONS] },
        visitAt: {
          type: 'string',
          description: 'YYYY-MM-DD or empty string to clear.',
        },
      },
      required: ['cityId', 'attractionId'],
    },
  },
  {
    name: 'delete_attraction',
    description: 'Remove an attraction by id.',
    parameters: {
      type: 'object',
      properties: {
        cityId: { type: 'string' },
        attractionId: { type: 'string' },
      },
      required: ['cityId', 'attractionId'],
    },
  },
  // --- Transport ---
  {
    name: 'set_inter_transport',
    description:
      'Set the transport mode (and optional cost) between two cities in the trip.',
    parameters: {
      type: 'object',
      properties: {
        fromCityId: { type: 'string' },
        toCityId: { type: 'string' },
        transportMode: { type: 'string', enum: [...TRANSPORT_MODES] },
        cost: { type: 'number', minimum: 0 },
      },
      required: ['fromCityId', 'toCityId', 'transportMode'],
    },
  },
  {
    name: 'set_intra_transport',
    description:
      'Set the transport mode (and optional cost) between two attractions in the same city.',
    parameters: {
      type: 'object',
      properties: {
        cityId: { type: 'string' },
        fromAttractionId: { type: 'string' },
        toAttractionId: { type: 'string' },
        transportMode: { type: 'string', enum: [...TRANSPORT_MODES] },
        cost: { type: 'number', minimum: 0 },
      },
      required: [
        'cityId',
        'fromAttractionId',
        'toAttractionId',
        'transportMode',
      ],
    },
  },
  // --- Expenses ---
  {
    name: 'add_expense',
    description:
      'Record an extra expense (meals, snacks, pharmacy, small shopping, etc.). If cityId is provided the expense is scoped to that city; otherwise it goes on the trip.',
    parameters: {
      type: 'object',
      properties: {
        cityId: {
          type: 'string',
          description:
            'Optional. Attach the expense to a specific city instead of the trip.',
        },
        description: { type: 'string' },
        category: { type: 'string', enum: [...EXPENSE_CATEGORIES] },
        cost: { type: 'number', minimum: 0 },
        date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['cost'],
    },
  },
  {
    name: 'update_expense',
    description: 'Update an existing expense (trip-level or city-level).',
    parameters: {
      type: 'object',
      properties: {
        cityId: {
          type: 'string',
          description: 'Provide if the expense lives on a city.',
        },
        expenseId: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string', enum: [...EXPENSE_CATEGORIES] },
        cost: { type: 'number', minimum: 0 },
        date: { type: 'string' },
      },
      required: ['expenseId'],
    },
  },
  {
    name: 'delete_expense',
    description: 'Remove an expense by id (trip-level or city-level).',
    parameters: {
      type: 'object',
      properties: {
        cityId: {
          type: 'string',
          description: 'Provide if the expense lives on a city.',
        },
        expenseId: { type: 'string' },
      },
      required: ['expenseId'],
    },
  },
];

export async function executeTool(
  tripId: string,
  name: string,
  args: any
): Promise<any> {
  const trip: any = await Trip.findById(tripId);
  if (!trip) throw new Error('Trip not found');

  const cityById = (id: string) => trip.cities.id(id);

  switch (name) {
    case 'list_trip': {
      return {
        currency: trip.currency || 'EUR',
        cities: trip.cities.map((c: any) => ({
          id: c._id.toString(),
          cityNumber: c.cityNumber,
          name: c.name,
          lat: c.coordinates.lat,
          lng: c.coordinates.lng,
          startDate: c.startDate || null,
          endDate: c.endDate || null,
          notes: c.notes,
          attractions: c.attractions.map((a: any) => ({
            id: a._id.toString(),
            attractionNumber: a.attractionNumber,
            name: a.poiName,
            lat: a.coordinates.lat,
            lng: a.coordinates.lng,
            cost: a.cost,
            isFree: a.isFree,
            rating: a.rating,
            attractionTypeIcon: a.attractionTypeIcon,
            reservationIcon: a.reservationIcon,
            visitAt: a.visitAt || null,
            notes: a.notes,
          })),
          legs: c.legs.map((l: any) => ({
            id: l._id.toString(),
            fromAttractionId: l.fromAttractionId.toString(),
            toAttractionId: l.toAttractionId.toString(),
            transportMode: l.transportMode,
            cost: Number(l.cost) || 0,
          })),
          expenses: (c.expenses || []).map((e: any) => ({
            id: e._id.toString(),
            category: e.category,
            description: e.description,
            cost: Number(e.cost) || 0,
            date: e.date || null,
          })),
        })),
        legs: trip.legs.map((l: any) => ({
          id: l._id.toString(),
          fromCityId: l.fromCityId.toString(),
          toCityId: l.toCityId.toString(),
          transportMode: l.transportMode,
          cost: Number(l.cost) || 0,
        })),
        expenses: (trip.expenses || []).map((e: any) => ({
          id: e._id.toString(),
          category: e.category,
          description: e.description,
          cost: Number(e.cost) || 0,
          date: e.date || null,
        })),
      };
    }

    // --- Cities ---
    case 'add_city': {
      const result = await geocode(String(args.query));
      if (!result) throw new Error('Could not geocode that location');
      const cityNumber = trip.cities.length + 1;
      trip.cities.push({
        name:
          (args.name && String(args.name).trim()) ||
          result.label.split(',')[0].trim(),
        coordinates: { lat: result.lat, lng: result.lng },
        cityNumber,
        startDate: args.startDate || null,
        endDate: args.endDate || null,
      });
      await trip.save();
      const added = trip.cities[trip.cities.length - 1];
      return { added: true, cityId: added._id.toString(), cityNumber };
    }

    case 'update_city': {
      const city = cityById(args.cityId);
      if (!city) throw new Error('City not found');
      for (const f of ['name', 'notes', 'startDate', 'endDate']) {
        if (args[f] !== undefined) city.set(f, args[f] || null);
      }
      trip.markModified('cities');
      await trip.save();
      return { updated: true };
    }

    case 'delete_city': {
      const city = cityById(args.cityId);
      if (!city) throw new Error('City not found');
      const cid = city._id.toString();
      city.deleteOne();
      trip.legs = trip.legs.filter(
        (l: any) =>
          l.fromCityId.toString() !== cid && l.toCityId.toString() !== cid
      );
      trip.cities.forEach((c: any, i: number) => (c.cityNumber = i + 1));
      await trip.save();
      return { deleted: true };
    }

    case 'reorder_cities': {
      const order: string[] = args.order;
      const byId = new Map(
        trip.cities.map((c: any) => [c._id.toString(), c])
      );
      if (
        order.length !== trip.cities.length ||
        order.some((id) => !byId.has(id))
      )
        throw new Error('order must list every existing cityId exactly once');
      const reordered = order.map((id, idx) => {
        const c: any = byId.get(id);
        c.cityNumber = idx + 1;
        return c;
      });
      trip.cities.splice(0, trip.cities.length, ...reordered);
      await trip.save();
      return { reordered: true, order };
    }

    case 'optimize_cities': {
      const order = nearestNeighborOrder(trip.cities as any);
      const byId = new Map(
        trip.cities.map((c: any) => [c._id.toString(), c])
      );
      const reordered = order.map((id, idx) => {
        const c: any = byId.get(id);
        c.cityNumber = idx + 1;
        return c;
      });
      trip.cities.splice(0, trip.cities.length, ...reordered);
      await trip.save();
      return { optimized: true, order };
    }

    // --- Attractions ---
    case 'add_attraction_by_city': {
      const city = cityById(args.cityId);
      if (!city) throw new Error('City not found');
      const result = await geocode(String(args.query));
      if (!result) throw new Error('Could not geocode that location');
      const attractionNumber = city.attractions.length + 1;
      city.attractions.push({
        poiName:
          (args.name && String(args.name).trim()) ||
          result.label.split(',')[0].trim(),
        coordinates: { lat: result.lat, lng: result.lng },
        attractionNumber,
      });
      trip.markModified('cities');
      await trip.save();
      const added = city.attractions[city.attractions.length - 1];
      return { added: true, attractionId: added._id.toString() };
    }

    case 'add_attraction_by_coords': {
      const city = cityById(args.cityId);
      if (!city) throw new Error('City not found');
      const attractionNumber = city.attractions.length + 1;
      city.attractions.push({
        poiName: String(args.name),
        coordinates: { lat: Number(args.lat), lng: Number(args.lng) },
        attractionNumber,
      });
      trip.markModified('cities');
      await trip.save();
      const added = city.attractions[city.attractions.length - 1];
      return { added: true, attractionId: added._id.toString() };
    }

    case 'update_attraction': {
      const city = cityById(args.cityId);
      if (!city) throw new Error('City not found');
      const att = city.attractions.id(args.attractionId);
      if (!att) throw new Error('Attraction not found');
      const fields = [
        'poiName',
        'notes',
        'cost',
        'isFree',
        'rating',
        'attractionTypeIcon',
        'reservationIcon',
        'visitAt',
      ];
      for (const f of fields) {
        if (args[f] !== undefined) {
          if (f === 'visitAt' && args[f] === '') att.set(f, null);
          else att.set(f, args[f]);
        }
      }
      trip.markModified('cities');
      await trip.save();
      return { updated: true };
    }

    case 'delete_attraction': {
      const city = cityById(args.cityId);
      if (!city) throw new Error('City not found');
      const att = city.attractions.id(args.attractionId);
      if (!att) throw new Error('Attraction not found');
      const aid = att._id.toString();
      att.deleteOne();
      city.legs = city.legs.filter(
        (l: any) =>
          l.fromAttractionId.toString() !== aid &&
          l.toAttractionId.toString() !== aid
      );
      city.attractions.forEach(
        (a: any, idx: number) => (a.attractionNumber = idx + 1)
      );
      trip.markModified('cities');
      await trip.save();
      return { deleted: true };
    }

    // --- Transport ---
    case 'set_inter_transport': {
      const cities: any[] = trip.cities;
      if (
        !cities.id(args.fromCityId) ||
        !cities.id(args.toCityId)
      )
        throw new Error('city ids must reference trip cities');
      if (!TRANSPORT_MODES.includes(args.transportMode))
        throw new Error('invalid transportMode');
      trip.legs = trip.legs.filter(
        (l: any) =>
          !(
            l.fromCityId.toString() === args.fromCityId &&
            l.toCityId.toString() === args.toCityId
          )
      );
      trip.legs.push({
        fromCityId: new Types.ObjectId(args.fromCityId),
        toCityId: new Types.ObjectId(args.toCityId),
        transportMode: args.transportMode,
        cost: Number(args.cost) || 0,
      });
      await trip.save();
      return { set: true };
    }

    case 'set_intra_transport': {
      const city = cityById(args.cityId);
      if (!city) throw new Error('City not found');
      if (
        !city.attractions.id(args.fromAttractionId) ||
        !city.attractions.id(args.toAttractionId)
      )
        throw new Error('attraction ids must belong to this city');
      if (!TRANSPORT_MODES.includes(args.transportMode))
        throw new Error('invalid transportMode');
      city.legs = city.legs.filter(
        (l: any) =>
          !(
            l.fromAttractionId.toString() === args.fromAttractionId &&
            l.toAttractionId.toString() === args.toAttractionId
          )
      );
      city.legs.push({
        fromAttractionId: new Types.ObjectId(args.fromAttractionId),
        toAttractionId: new Types.ObjectId(args.toAttractionId),
        transportMode: args.transportMode,
        cost: Number(args.cost) || 0,
      });
      trip.markModified('cities');
      await trip.save();
      return { set: true };
    }

    // --- Expenses (trip-level or city-level when cityId is provided) ---
    case 'add_expense': {
      const target = args.cityId ? cityById(args.cityId) : trip;
      if (args.cityId && !target) throw new Error('City not found');
      target.expenses.push({
        description: String(args.description ?? ''),
        category: args.category || 'other',
        cost: Number(args.cost) || 0,
        date: args.date || null,
      });
      if (args.cityId) trip.markModified('cities');
      await trip.save();
      const list = target.expenses;
      const added = list[list.length - 1];
      return { added: true, id: added._id.toString(), scope: args.cityId ? 'city' : 'trip' };
    }

    case 'update_expense': {
      const target = args.cityId ? cityById(args.cityId) : trip;
      if (args.cityId && !target) throw new Error('City not found');
      const expense = target.expenses.id(args.expenseId);
      if (!expense) throw new Error('Expense not found');
      for (const f of ['description', 'category', 'cost', 'date']) {
        if (args[f] !== undefined)
          expense.set(f, args[f] || (f === 'cost' ? 0 : null));
      }
      if (args.cityId) trip.markModified('cities');
      else trip.markModified('expenses');
      await trip.save();
      return { updated: true };
    }

    case 'delete_expense': {
      const target = args.cityId ? cityById(args.cityId) : trip;
      if (args.cityId && !target) throw new Error('City not found');
      const expense = target.expenses.id(args.expenseId);
      if (!expense) throw new Error('Expense not found');
      expense.deleteOne();
      if (args.cityId) trip.markModified('cities');
      await trip.save();
      return { deleted: true };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

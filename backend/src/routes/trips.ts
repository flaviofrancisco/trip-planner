import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  Trip,
  TRANSPORT_MODES,
  ATTRACTION_ICONS,
  RESERVATION_ICONS,
  EXPENSE_CATEGORIES,
} from '../models/Trip';
import { User } from '../models/User';
import { decorateTripForUser } from '../services/tripResponse';

const router = Router();

router.use(requireAuth);

type Permission = 'viewer' | 'editor' | 'owner';

async function loadTripWithAccess(tripId: string, userId: string) {
  if (!Types.ObjectId.isValid(tripId)) return null;
  const trip = await Trip.findById(tripId);
  if (!trip) return null;
  let permission: Permission | null = null;
  if (trip.ownerId.toString() === userId) permission = 'owner';
  else {
    const share = trip.sharedWith.find(
      (s: any) => s.userId.toString() === userId
    );
    if (share) permission = share.permission as Permission;
  }
  if (!permission) return null;
  return { trip, permission };
}

const coordSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// ---------- Trip CRUD ----------
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const userObjectId = new Types.ObjectId(req.userId!);
    const trips = await Trip.find({
      $or: [{ ownerId: userObjectId }, { 'sharedWith.userId': userObjectId }],
    })
      .sort({ updatedAt: -1 })
      .select(
        'title ownerId sharedWith cities legs expenses currency updatedAt createdAt'
      );
    res.json(
      trips.map((t) => {
        const obj = t.toJSON() as any;
        const cityCount = obj.cities?.length || 0;
        const attractionCount = (obj.cities || []).reduce(
          (s: number, c: any) => s + (c.attractions?.length || 0),
          0
        );
        return {
          id: obj.id,
          title: obj.title,
          ownerId: obj.ownerId,
          totalCost: obj.totalCost,
          currency: obj.currency || 'EUR',
          cityCount,
          attractionCount,
          permission:
            obj.ownerId === req.userId
              ? 'owner'
              : obj.sharedWith.find((s: any) => s.userId === req.userId)
                  ?.permission || 'viewer',
          updatedAt: obj.updatedAt,
        };
      })
    );
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { title } = z.object({ title: z.string().min(1) }).parse(req.body);
    const trip = await Trip.create({ title, ownerId: req.userId });
    res.status(201).json(await decorateTripForUser(trip, req.userId!));
  } catch (err) {
    next(err);
  }
});

router.get('/:tripId', async (req: AuthRequest, res, next) => {
  try {
    const access = await loadTripWithAccess(req.params.tripId, req.userId!);
    if (!access) return res.status(404).json({ error: 'Trip not found' });
    res.json(await decorateTripForUser(access.trip, req.userId!));
  } catch (err) {
    next(err);
  }
});

router.patch('/:tripId', async (req: AuthRequest, res, next) => {
  try {
    const access = await loadTripWithAccess(req.params.tripId, req.userId!);
    if (!access) return res.status(404).json({ error: 'Trip not found' });
    if (access.permission === 'viewer')
      return res.status(403).json({ error: 'Read-only access' });
    const data = z
      .object({
        title: z.string().min(1).optional(),
        currency: z.string().length(3).optional(),
      })
      .parse(req.body);
    if (data.title) access.trip.title = data.title;
    if (data.currency)
      (access.trip as any).currency = data.currency.toUpperCase();
    await access.trip.save();
    res.json(await decorateTripForUser(access.trip, req.userId!));
  } catch (err) {
    next(err);
  }
});

router.delete('/:tripId', async (req: AuthRequest, res, next) => {
  try {
    const access = await loadTripWithAccess(req.params.tripId, req.userId!);
    if (!access) return res.status(404).json({ error: 'Trip not found' });
    if (access.permission !== 'owner')
      return res.status(403).json({ error: 'Only the owner can delete' });
    await access.trip.deleteOne();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---------- Cities ----------
const citySchema = z.object({
  name: z.string().min(1),
  coordinates: coordSchema,
  notes: z.string().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

router.post('/:tripId/cities', async (req: AuthRequest, res, next) => {
  try {
    const access = await loadTripWithAccess(req.params.tripId, req.userId!);
    if (!access) return res.status(404).json({ error: 'Trip not found' });
    if (access.permission === 'viewer')
      return res.status(403).json({ error: 'Read-only access' });
    const data = citySchema.parse(req.body);
    const cityNumber = (access.trip as any).cities.length + 1;
    (access.trip as any).cities.push({ ...data, cityNumber });
    await access.trip.save();
    res.status(201).json(await decorateTripForUser(access.trip, req.userId!));
  } catch (err) {
    next(err);
  }
});

router.patch('/:tripId/cities/:cityId', async (req: AuthRequest, res, next) => {
  try {
    const access = await loadTripWithAccess(req.params.tripId, req.userId!);
    if (!access) return res.status(404).json({ error: 'Trip not found' });
    if (access.permission === 'viewer')
      return res.status(403).json({ error: 'Read-only access' });
    const data = citySchema.partial().parse(req.body);
    const city = (access.trip as any).cities.id(req.params.cityId);
    if (!city) return res.status(404).json({ error: 'City not found' });
    if (data.name !== undefined) city.set('name', data.name);
    if (data.coordinates !== undefined) city.set('coordinates', data.coordinates);
    if (data.notes !== undefined) city.set('notes', data.notes);
    if (data.startDate !== undefined) city.set('startDate', data.startDate);
    if (data.endDate !== undefined) city.set('endDate', data.endDate);
    (access.trip as any).markModified('cities');
    await access.trip.save();
    res.json(await decorateTripForUser(access.trip, req.userId!));
  } catch (err) {
    next(err);
  }
});

router.delete('/:tripId/cities/:cityId', async (req: AuthRequest, res, next) => {
  try {
    const access = await loadTripWithAccess(req.params.tripId, req.userId!);
    if (!access) return res.status(404).json({ error: 'Trip not found' });
    if (access.permission === 'viewer')
      return res.status(403).json({ error: 'Read-only access' });
    const city = (access.trip as any).cities.id(req.params.cityId);
    if (!city) return res.status(404).json({ error: 'City not found' });
    const cid = city._id.toString();
    city.deleteOne();
    // remove any inter-city legs touching this city
    (access.trip as any).legs = (access.trip as any).legs.filter(
      (l: any) =>
        l.fromCityId.toString() !== cid && l.toCityId.toString() !== cid
    );
    (access.trip as any).cities.forEach((c: any, i: number) => {
      c.cityNumber = i + 1;
    });
    await access.trip.save();
    res.json(await decorateTripForUser(access.trip, req.userId!));
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:tripId/cities/reorder',
  async (req: AuthRequest, res, next) => {
    try {
      const access = await loadTripWithAccess(req.params.tripId, req.userId!);
      if (!access) return res.status(404).json({ error: 'Trip not found' });
      if (access.permission === 'viewer')
        return res.status(403).json({ error: 'Read-only access' });
      const { order } = z
        .object({ order: z.array(z.string()) })
        .parse(req.body);
      const list: any[] = (access.trip as any).cities;
      const byId = new Map(list.map((c: any) => [c._id.toString(), c]));
      if (order.length !== list.length || order.some((id) => !byId.has(id)))
        return res.status(400).json({ error: 'Invalid order' });
      const reordered = order.map((id, idx) => {
        const c: any = byId.get(id);
        c.cityNumber = idx + 1;
        return c;
      });
      list.splice(0, list.length, ...reordered);
      await access.trip.save();
      res.json(await decorateTripForUser(access.trip, req.userId!));
    } catch (err) {
      next(err);
    }
  }
);

// ---------- Attractions (within a city) ----------
const attractionSchema = z.object({
  poiName: z.string().min(1),
  coordinates: coordSchema,
  notes: z.string().optional(),
  cost: z.number().min(0).optional(),
  isFree: z.boolean().optional(),
  rating: z.number().min(0).max(5).optional(),
  attractionTypeIcon: z.enum(ATTRACTION_ICONS).optional(),
  reservationIcon: z.enum(RESERVATION_ICONS).optional(),
  visitAt: z.string().nullable().optional(),
});

function loadCity(trip: any, cityId: string) {
  return trip.cities.id(cityId);
}

router.post(
  '/:tripId/cities/:cityId/attractions',
  async (req: AuthRequest, res, next) => {
    try {
      const access = await loadTripWithAccess(req.params.tripId, req.userId!);
      if (!access) return res.status(404).json({ error: 'Trip not found' });
      if (access.permission === 'viewer')
        return res.status(403).json({ error: 'Read-only access' });
      const city = loadCity(access.trip, req.params.cityId);
      if (!city) return res.status(404).json({ error: 'City not found' });
      const data = attractionSchema.parse(req.body);
      const attractionNumber = city.attractions.length + 1;
      city.attractions.push({ ...data, attractionNumber });
      (access.trip as any).markModified('cities');
      await access.trip.save();
      res.status(201).json(await decorateTripForUser(access.trip, req.userId!));
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:tripId/cities/:cityId/attractions/:attractionId',
  async (req: AuthRequest, res, next) => {
    try {
      const access = await loadTripWithAccess(req.params.tripId, req.userId!);
      if (!access) return res.status(404).json({ error: 'Trip not found' });
      if (access.permission === 'viewer')
        return res.status(403).json({ error: 'Read-only access' });
      const city = loadCity(access.trip, req.params.cityId);
      if (!city) return res.status(404).json({ error: 'City not found' });
      const data = attractionSchema.partial().parse(req.body);
      const att = city.attractions.id(req.params.attractionId);
      if (!att)
        return res.status(404).json({ error: 'Attraction not found' });
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) att.set(k, v);
      }
      (access.trip as any).markModified('cities');
      await access.trip.save();
      res.json(await decorateTripForUser(access.trip, req.userId!));
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:tripId/cities/:cityId/attractions/:attractionId',
  async (req: AuthRequest, res, next) => {
    try {
      const access = await loadTripWithAccess(req.params.tripId, req.userId!);
      if (!access) return res.status(404).json({ error: 'Trip not found' });
      if (access.permission === 'viewer')
        return res.status(403).json({ error: 'Read-only access' });
      const city = loadCity(access.trip, req.params.cityId);
      if (!city) return res.status(404).json({ error: 'City not found' });
      const att = city.attractions.id(req.params.attractionId);
      if (!att) return res.status(404).json({ error: 'Attraction not found' });
      const aid = att._id.toString();
      att.deleteOne();
      city.legs = city.legs.filter(
        (l: any) =>
          l.fromAttractionId.toString() !== aid &&
          l.toAttractionId.toString() !== aid
      );
      city.attractions.forEach((a: any, idx: number) => {
        a.attractionNumber = idx + 1;
      });
      (access.trip as any).markModified('cities');
      await access.trip.save();
      res.json(await decorateTripForUser(access.trip, req.userId!));
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:tripId/cities/:cityId/attractions/reorder',
  async (req: AuthRequest, res, next) => {
    try {
      const access = await loadTripWithAccess(req.params.tripId, req.userId!);
      if (!access) return res.status(404).json({ error: 'Trip not found' });
      if (access.permission === 'viewer')
        return res.status(403).json({ error: 'Read-only access' });
      const city = loadCity(access.trip, req.params.cityId);
      if (!city) return res.status(404).json({ error: 'City not found' });
      const { order } = z
        .object({ order: z.array(z.string()) })
        .parse(req.body);
      const list: any[] = city.attractions;
      const byId = new Map(list.map((a: any) => [a._id.toString(), a]));
      if (order.length !== list.length || order.some((id) => !byId.has(id)))
        return res.status(400).json({ error: 'Invalid order' });
      const reordered = order.map((id, idx) => {
        const a: any = byId.get(id);
        a.attractionNumber = idx + 1;
        return a;
      });
      list.splice(0, list.length, ...reordered);
      (access.trip as any).markModified('cities');
      await access.trip.save();
      res.json(await decorateTripForUser(access.trip, req.userId!));
    } catch (err) {
      next(err);
    }
  }
);

// ---------- Intra-city legs (between attractions in a city) ----------
const intraLegSchema = z.object({
  fromAttractionId: z.string(),
  toAttractionId: z.string(),
  transportMode: z.enum(TRANSPORT_MODES),
  cost: z.number().min(0).optional(),
});
const intraLegPatchSchema = z
  .object({
    transportMode: z.enum(TRANSPORT_MODES).optional(),
    cost: z.number().min(0).optional(),
  })
  .refine((d) => d.transportMode !== undefined || d.cost !== undefined, {
    message: 'Provide transportMode and/or cost',
  });

router.post(
  '/:tripId/cities/:cityId/legs',
  async (req: AuthRequest, res, next) => {
    try {
      const access = await loadTripWithAccess(req.params.tripId, req.userId!);
      if (!access) return res.status(404).json({ error: 'Trip not found' });
      if (access.permission === 'viewer')
        return res.status(403).json({ error: 'Read-only access' });
      const city = loadCity(access.trip, req.params.cityId);
      if (!city) return res.status(404).json({ error: 'City not found' });
      const data = intraLegSchema.parse(req.body);
      if (
        !city.attractions.id(data.fromAttractionId) ||
        !city.attractions.id(data.toAttractionId)
      )
        return res
          .status(400)
          .json({ error: 'Attraction ids must belong to this city' });
      city.legs = city.legs.filter(
        (l: any) =>
          !(
            l.fromAttractionId.toString() === data.fromAttractionId &&
            l.toAttractionId.toString() === data.toAttractionId
          )
      );
      city.legs.push({
        fromAttractionId: new Types.ObjectId(data.fromAttractionId),
        toAttractionId: new Types.ObjectId(data.toAttractionId),
        transportMode: data.transportMode,
        cost: data.cost ?? 0,
      });
      (access.trip as any).markModified('cities');
      await access.trip.save();
      res.status(201).json(await decorateTripForUser(access.trip, req.userId!));
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:tripId/cities/:cityId/legs/:legId',
  async (req: AuthRequest, res, next) => {
    try {
      const access = await loadTripWithAccess(req.params.tripId, req.userId!);
      if (!access) return res.status(404).json({ error: 'Trip not found' });
      if (access.permission === 'viewer')
        return res.status(403).json({ error: 'Read-only access' });
      const city = loadCity(access.trip, req.params.cityId);
      if (!city) return res.status(404).json({ error: 'City not found' });
      const patch = intraLegPatchSchema.parse(req.body);
      const leg = city.legs.id(req.params.legId);
      if (!leg) return res.status(404).json({ error: 'Leg not found' });
      if (patch.transportMode) leg.set('transportMode', patch.transportMode);
      if (patch.cost !== undefined) leg.set('cost', Number(patch.cost) || 0);
      (access.trip as any).markModified('cities');
      await access.trip.save();
      res.json(await decorateTripForUser(access.trip, req.userId!));
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:tripId/cities/:cityId/legs/:legId',
  async (req: AuthRequest, res, next) => {
    try {
      const access = await loadTripWithAccess(req.params.tripId, req.userId!);
      if (!access) return res.status(404).json({ error: 'Trip not found' });
      if (access.permission === 'viewer')
        return res.status(403).json({ error: 'Read-only access' });
      const city = loadCity(access.trip, req.params.cityId);
      if (!city) return res.status(404).json({ error: 'City not found' });
      const leg = city.legs.id(req.params.legId);
      if (!leg) return res.status(404).json({ error: 'Leg not found' });
      leg.deleteOne();
      (access.trip as any).markModified('cities');
      await access.trip.save();
      res.json(await decorateTripForUser(access.trip, req.userId!));
    } catch (err) {
      next(err);
    }
  }
);

// ---------- Inter-city legs (trip-level) ----------
const interLegSchema = z.object({
  fromCityId: z.string(),
  toCityId: z.string(),
  transportMode: z.enum(TRANSPORT_MODES),
  cost: z.number().min(0).optional(),
});
const interLegPatchSchema = z
  .object({
    transportMode: z.enum(TRANSPORT_MODES).optional(),
    cost: z.number().min(0).optional(),
  })
  .refine((d) => d.transportMode !== undefined || d.cost !== undefined, {
    message: 'Provide transportMode and/or cost',
  });

router.post('/:tripId/legs', async (req: AuthRequest, res, next) => {
  try {
    const access = await loadTripWithAccess(req.params.tripId, req.userId!);
    if (!access) return res.status(404).json({ error: 'Trip not found' });
    if (access.permission === 'viewer')
      return res.status(403).json({ error: 'Read-only access' });
    const data = interLegSchema.parse(req.body);
    const cities: any[] = (access.trip as any).cities;
    if (
      !cities.id(data.fromCityId) ||
      !cities.id(data.toCityId)
    )
      return res
        .status(400)
        .json({ error: 'City ids must belong to this trip' });
    (access.trip as any).legs = (access.trip as any).legs.filter(
      (l: any) =>
        !(
          l.fromCityId.toString() === data.fromCityId &&
          l.toCityId.toString() === data.toCityId
        )
    );
    (access.trip as any).legs.push({
      fromCityId: new Types.ObjectId(data.fromCityId),
      toCityId: new Types.ObjectId(data.toCityId),
      transportMode: data.transportMode,
      cost: data.cost ?? 0,
    });
    await access.trip.save();
    res.status(201).json(await decorateTripForUser(access.trip, req.userId!));
  } catch (err) {
    next(err);
  }
});

router.patch('/:tripId/legs/:legId', async (req: AuthRequest, res, next) => {
  try {
    const access = await loadTripWithAccess(req.params.tripId, req.userId!);
    if (!access) return res.status(404).json({ error: 'Trip not found' });
    if (access.permission === 'viewer')
      return res.status(403).json({ error: 'Read-only access' });
    const patch = interLegPatchSchema.parse(req.body);
    const leg = (access.trip as any).legs.id(req.params.legId);
    if (!leg) return res.status(404).json({ error: 'Leg not found' });
    if (patch.transportMode) leg.set('transportMode', patch.transportMode);
    if (patch.cost !== undefined) leg.set('cost', Number(patch.cost) || 0);
    (access.trip as any).markModified('legs');
    await access.trip.save();
    res.json(await decorateTripForUser(access.trip, req.userId!));
  } catch (err) {
    next(err);
  }
});

router.delete('/:tripId/legs/:legId', async (req: AuthRequest, res, next) => {
  try {
    const access = await loadTripWithAccess(req.params.tripId, req.userId!);
    if (!access) return res.status(404).json({ error: 'Trip not found' });
    if (access.permission === 'viewer')
      return res.status(403).json({ error: 'Read-only access' });
    const leg = (access.trip as any).legs.id(req.params.legId);
    if (!leg) return res.status(404).json({ error: 'Leg not found' });
    leg.deleteOne();
    await access.trip.save();
    res.json(await decorateTripForUser(access.trip, req.userId!));
  } catch (err) {
    next(err);
  }
});

// ---------- Expenses ----------
const expenseSchema = z.object({
  description: z.string().optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  cost: z.number().min(0).optional(),
  date: z.string().nullable().optional(),
});

router.post('/:tripId/expenses', async (req: AuthRequest, res, next) => {
  try {
    const access = await loadTripWithAccess(req.params.tripId, req.userId!);
    if (!access) return res.status(404).json({ error: 'Trip not found' });
    if (access.permission === 'viewer')
      return res.status(403).json({ error: 'Read-only access' });
    const data = expenseSchema.parse(req.body);
    (access.trip as any).expenses.push({
      description: data.description ?? '',
      category: data.category ?? 'other',
      cost: data.cost ?? 0,
      date: data.date ?? null,
    });
    await access.trip.save();
    res.status(201).json(await decorateTripForUser(access.trip, req.userId!));
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:tripId/expenses/:expenseId',
  async (req: AuthRequest, res, next) => {
    try {
      const access = await loadTripWithAccess(req.params.tripId, req.userId!);
      if (!access) return res.status(404).json({ error: 'Trip not found' });
      if (access.permission === 'viewer')
        return res.status(403).json({ error: 'Read-only access' });
      const data = expenseSchema.parse(req.body);
      const expense = (access.trip as any).expenses.id(req.params.expenseId);
      if (!expense) return res.status(404).json({ error: 'Expense not found' });
      if (data.description !== undefined)
        expense.set('description', data.description);
      if (data.category !== undefined) expense.set('category', data.category);
      if (data.cost !== undefined)
        expense.set('cost', Number(data.cost) || 0);
      if (data.date !== undefined) expense.set('date', data.date);
      (access.trip as any).markModified('expenses');
      await access.trip.save();
      res.json(await decorateTripForUser(access.trip, req.userId!));
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:tripId/expenses/:expenseId',
  async (req: AuthRequest, res, next) => {
    try {
      const access = await loadTripWithAccess(req.params.tripId, req.userId!);
      if (!access) return res.status(404).json({ error: 'Trip not found' });
      if (access.permission === 'viewer')
        return res.status(403).json({ error: 'Read-only access' });
      const expense = (access.trip as any).expenses.id(req.params.expenseId);
      if (!expense) return res.status(404).json({ error: 'Expense not found' });
      expense.deleteOne();
      await access.trip.save();
      res.json(await decorateTripForUser(access.trip, req.userId!));
    } catch (err) {
      next(err);
    }
  }
);

// ---------- City-level expenses ----------
router.post(
  '/:tripId/cities/:cityId/expenses',
  async (req: AuthRequest, res, next) => {
    try {
      const access = await loadTripWithAccess(req.params.tripId, req.userId!);
      if (!access) return res.status(404).json({ error: 'Trip not found' });
      if (access.permission === 'viewer')
        return res.status(403).json({ error: 'Read-only access' });
      const city = loadCity(access.trip, req.params.cityId);
      if (!city) return res.status(404).json({ error: 'City not found' });
      const data = expenseSchema.parse(req.body);
      city.expenses.push({
        description: data.description ?? '',
        category: data.category ?? 'other',
        cost: data.cost ?? 0,
        date: data.date ?? null,
      });
      (access.trip as any).markModified('cities');
      await access.trip.save();
      res.status(201).json(await decorateTripForUser(access.trip, req.userId!));
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:tripId/cities/:cityId/expenses/:expenseId',
  async (req: AuthRequest, res, next) => {
    try {
      const access = await loadTripWithAccess(req.params.tripId, req.userId!);
      if (!access) return res.status(404).json({ error: 'Trip not found' });
      if (access.permission === 'viewer')
        return res.status(403).json({ error: 'Read-only access' });
      const city = loadCity(access.trip, req.params.cityId);
      if (!city) return res.status(404).json({ error: 'City not found' });
      const data = expenseSchema.parse(req.body);
      const expense = city.expenses.id(req.params.expenseId);
      if (!expense) return res.status(404).json({ error: 'Expense not found' });
      if (data.description !== undefined)
        expense.set('description', data.description);
      if (data.category !== undefined) expense.set('category', data.category);
      if (data.cost !== undefined)
        expense.set('cost', Number(data.cost) || 0);
      if (data.date !== undefined) expense.set('date', data.date);
      (access.trip as any).markModified('cities');
      await access.trip.save();
      res.json(await decorateTripForUser(access.trip, req.userId!));
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:tripId/cities/:cityId/expenses/:expenseId',
  async (req: AuthRequest, res, next) => {
    try {
      const access = await loadTripWithAccess(req.params.tripId, req.userId!);
      if (!access) return res.status(404).json({ error: 'Trip not found' });
      if (access.permission === 'viewer')
        return res.status(403).json({ error: 'Read-only access' });
      const city = loadCity(access.trip, req.params.cityId);
      if (!city) return res.status(404).json({ error: 'City not found' });
      const expense = city.expenses.id(req.params.expenseId);
      if (!expense) return res.status(404).json({ error: 'Expense not found' });
      expense.deleteOne();
      (access.trip as any).markModified('cities');
      await access.trip.save();
      res.json(await decorateTripForUser(access.trip, req.userId!));
    } catch (err) {
      next(err);
    }
  }
);

// ---------- Sharing ----------
const shareSchema = z.object({
  email: z.string().email(),
  permission: z.enum(['viewer', 'editor']),
});

router.post('/:tripId/share', async (req: AuthRequest, res, next) => {
  try {
    const access = await loadTripWithAccess(req.params.tripId, req.userId!);
    if (!access) return res.status(404).json({ error: 'Trip not found' });
    if (access.permission !== 'owner')
      return res.status(403).json({ error: 'Only the owner can share' });
    const data = shareSchema.parse(req.body);
    const target = await User.findOne({ email: data.email.toLowerCase() });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.id === req.userId)
      return res.status(400).json({ error: "You can't share with yourself" });
    const existing = access.trip.sharedWith.find(
      (s: any) => s.userId.toString() === target.id
    );
    if (existing) {
      existing.permission = data.permission;
    } else {
      (access.trip.sharedWith as any).push({
        userId: target._id,
        permission: data.permission,
      });
    }
    await access.trip.save();
    res.json(await decorateTripForUser(access.trip, req.userId!));
  } catch (err) {
    next(err);
  }
});

router.delete(
  '/:tripId/share/:userId',
  async (req: AuthRequest, res, next) => {
    try {
      const access = await loadTripWithAccess(req.params.tripId, req.userId!);
      if (!access) return res.status(404).json({ error: 'Trip not found' });
      if (access.permission !== 'owner')
        return res.status(403).json({ error: 'Only the owner can unshare' });
      access.trip.sharedWith = access.trip.sharedWith.filter(
        (s: any) => s.userId.toString() !== req.params.userId
      ) as any;
      await access.trip.save();
      res.json(await decorateTripForUser(access.trip, req.userId!));
    } catch (err) {
      next(err);
    }
  }
);

export default router;

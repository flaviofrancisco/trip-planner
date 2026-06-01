import { Schema, model, Types } from 'mongoose';

export const TRANSPORT_MODES = [
  'train',
  'foot',
  'taxi',
  'plane',
  'ferry',
  'bus',
  'car',
  'metro',
  'transit',
  'bicycle',
  'motorcycle',
  'tram',
  'cablecar',
  'funicular',
] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const ATTRACTION_ICONS = [
  'museum',
  'restaurant',
  'park',
  'landmark',
  'beach',
  'mountain',
  'shopping',
  'nightlife',
  'theater',
  'church',
  'zoo',
  'viewpoint',
  'hotel',
  'airbnb',
  'other',
] as const;

export const RESERVATION_ICONS = [
  'none',
  'hotel',
  'airbnb',
  'museum',
  'restaurant',
  'guided',
  'boat',
] as const;

export const EXPENSE_CATEGORIES = [
  'breakfast',
  'lunch',
  'dinner',
  'snacks',
  'drinks',
  'pharmacy',
  'shopping',
  'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// --- Attraction (a stop within a city) ---
const attractionSchema = new Schema(
  {
    attractionNumber: { type: Number, required: true },
    poiName: { type: String, required: true, trim: true },
    address: { type: String, default: '' },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    notes: { type: String, default: '' },
    cost: { type: Number, default: 0, min: 0 },
    isFree: { type: Boolean, default: false },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    attractionTypeIcon: { type: String, enum: ATTRACTION_ICONS, default: 'other' },
    reservationIcon: { type: String, enum: RESERVATION_ICONS, default: 'none' },
    // Wall-clock string: "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm"
    visitAt: { type: String, default: null },
  },
  { _id: true, timestamps: true }
);

// --- Intra-city leg (between two attractions in the same city) ---
const intraLegSchema = new Schema(
  {
    fromAttractionId: { type: Schema.Types.ObjectId, required: true },
    toAttractionId: { type: Schema.Types.ObjectId, required: true },
    transportMode: { type: String, enum: TRANSPORT_MODES, required: true },
    cost: { type: Number, default: 0, min: 0 },
    duration: { type: String, default: null },
    distance: { type: String, default: null },
    routePolyline: { type: String, default: null },
  },
  { _id: true }
);

// --- Expense (used at both trip and city level) ---
const expenseSchema = new Schema(
  {
    category: { type: String, enum: EXPENSE_CATEGORIES, default: 'other' },
    description: { type: String, default: '', trim: true },
    cost: { type: Number, default: 0, min: 0 },
    date: { type: String, default: null },
  },
  { _id: true, timestamps: true }
);

// --- City ---
const citySchema = new Schema(
  {
    cityNumber: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    notes: { type: String, default: '' },
    startDate: { type: String, default: null },
    endDate: { type: String, default: null },
    attractions: { type: [attractionSchema], default: [] },
    legs: { type: [intraLegSchema], default: [] },
    expenses: { type: [expenseSchema], default: [] },
  },
  { _id: true, timestamps: true }
);

// --- Inter-city leg (trip-level) ---
const interLegSchema = new Schema(
  {
    fromCityId: { type: Schema.Types.ObjectId, required: true },
    toCityId: { type: Schema.Types.ObjectId, required: true },
    transportMode: { type: String, enum: TRANSPORT_MODES, required: true },
    cost: { type: Number, default: 0, min: 0 },
    duration: { type: String, default: null },
    distance: { type: String, default: null },
    routePolyline: { type: String, default: null },
  },
  { _id: true }
);

const sharedWithSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    permission: { type: String, enum: ['viewer', 'editor'], required: true },
  },
  { _id: false }
);

const tripSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sharedWith: { type: [sharedWithSchema], default: [] },
    cities: { type: [citySchema], default: [] },
    legs: { type: [interLegSchema], default: [] },
    expenses: { type: [expenseSchema], default: [] },
    currency: { type: String, default: 'EUR', uppercase: true, trim: true },
  },
  { timestamps: true }
);

tripSchema.virtual('totalCost').get(function () {
  // @ts-ignore
  const cities = (this.cities as any[]) || [];
  // @ts-ignore
  const interLegs = (this.legs as any[]) || [];
  // @ts-ignore
  const expenses = (this.expenses as any[]) || [];

  let cityTotal = 0;
  for (const c of cities) {
    const atts = (c.attractions as any[]) || [];
    cityTotal += atts.reduce(
      (s, a) => s + (a.isFree ? 0 : Number(a.cost) || 0),
      0
    );
    const intras = (c.legs as any[]) || [];
    cityTotal += intras.reduce((s, l) => s + (Number(l.cost) || 0), 0);
    const cExp = (c.expenses as any[]) || [];
    cityTotal += cExp.reduce((s, e) => s + (Number(e.cost) || 0), 0);
  }
  const interTotal = interLegs.reduce(
    (s, l) => s + (Number(l.cost) || 0),
    0
  );
  const expensesTotal = expenses.reduce(
    (s, e) => s + (Number(e.cost) || 0),
    0
  );
  return cityTotal + interTotal + expensesTotal;
});

const mapId = (o: any) => {
  if (o && o._id) {
    o.id = o._id.toString();
    delete o._id;
  }
  return o;
};

const transformDoc = (_doc: any, ret: any) => {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;

  if (Array.isArray(ret.cities)) {
    ret.cities = ret.cities.map((c: any) => {
      mapId(c);
      if (Array.isArray(c.attractions)) {
        c.attractions = c.attractions.map((a: any) => mapId(a));
      }
      if (Array.isArray(c.legs)) {
        c.legs = c.legs.map((l: any) => {
          mapId(l);
          l.fromAttractionId = l.fromAttractionId?.toString();
          l.toAttractionId = l.toAttractionId?.toString();
          return l;
        });
      }
      if (Array.isArray(c.expenses)) {
        c.expenses = c.expenses.map((e: any) => mapId(e));
      }
      return c;
    });
  }
  if (Array.isArray(ret.legs)) {
    ret.legs = ret.legs.map((l: any) => {
      mapId(l);
      l.fromCityId = l.fromCityId?.toString();
      l.toCityId = l.toCityId?.toString();
      return l;
    });
  }
  if (Array.isArray(ret.expenses)) {
    ret.expenses = ret.expenses.map((e: any) => mapId(e));
  }
  if (Array.isArray(ret.sharedWith)) {
    ret.sharedWith = ret.sharedWith.map((s: any) => ({
      userId: s.userId?.toString(),
      permission: s.permission,
    }));
  }
  ret.ownerId = ret.ownerId?.toString();
  return ret;
};

tripSchema.set('toJSON', { virtuals: true, transform: transformDoc });
tripSchema.set('toObject', { virtuals: true, transform: transformDoc });

export const Trip = model('Trip', tripSchema);

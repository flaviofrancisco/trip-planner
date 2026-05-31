export type TransportMode =
  | 'train'
  | 'foot'
  | 'taxi'
  | 'plane'
  | 'ferry'
  | 'bus'
  | 'car'
  | 'metro';

export type ExpenseCategory =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snacks'
  | 'drinks'
  | 'pharmacy'
  | 'shopping'
  | 'other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  cost: number;
  date: string | null;
}

export type AttractionIcon =
  | 'museum'
  | 'restaurant'
  | 'park'
  | 'landmark'
  | 'beach'
  | 'mountain'
  | 'shopping'
  | 'nightlife'
  | 'theater'
  | 'church'
  | 'zoo'
  | 'viewpoint'
  | 'other';

export type ReservationIcon =
  | 'none'
  | 'hotel'
  | 'airbnb'
  | 'museum'
  | 'restaurant'
  | 'guided'
  | 'boat';

export interface User {
  id: string;
  email: string;
  name: string;
  apiKeys?: { openai: boolean; gemini: boolean };
  preferences?: { theme: 'light' | 'dark' | 'system' };
}

export interface Attraction {
  id: string;
  attractionNumber: number;
  poiName: string;
  coordinates: { lat: number; lng: number };
  notes: string;
  cost: number;
  isFree: boolean;
  rating: number;
  attractionTypeIcon: AttractionIcon;
  reservationIcon: ReservationIcon;
  visitAt: string | null;
}

export interface IntraLeg {
  id: string;
  fromAttractionId: string;
  toAttractionId: string;
  transportMode: TransportMode;
  cost: number;
}

export interface City {
  id: string;
  cityNumber: number;
  name: string;
  coordinates: { lat: number; lng: number };
  notes: string;
  startDate: string | null;
  endDate: string | null;
  attractions: Attraction[];
  legs: IntraLeg[];
  expenses: Expense[];
}

export interface InterLeg {
  id: string;
  fromCityId: string;
  toCityId: string;
  transportMode: TransportMode;
  cost: number;
}

export interface ShareEntry {
  userId: string;
  permission: 'viewer' | 'editor';
  email?: string;
  name?: string;
}

export interface Trip {
  id: string;
  title: string;
  ownerId: string;
  cities: City[];
  legs: InterLeg[];
  expenses: Expense[];
  sharedWith: ShareEntry[];
  totalCost: number;
  currency: string;
  permission?: 'owner' | 'viewer' | 'editor';
  updatedAt: string;
}

export interface TripSummary {
  id: string;
  title: string;
  ownerId: string;
  totalCost: number;
  currency: string;
  cityCount: number;
  attractionCount: number;
  permission: 'owner' | 'viewer' | 'editor';
  updatedAt: string;
}

export type AIProvider = 'openai' | 'gemini';

export const GEMINI_MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash'] as const;
export type GeminiModel = (typeof GEMINI_MODELS)[number];
export const GEMINI_MODEL_LABELS: Record<GeminiModel, string> = {
  'gemini-2.5-pro': 'Gemini 2.5 Pro (paid)',
  'gemini-2.5-flash': 'Gemini 2.5 Flash (free tier)',
};
export const DEFAULT_GEMINI_MODEL: GeminiModel = 'gemini-2.5-flash';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: { name: string; args: any; result: any; error?: string }[];
}

import type {
  TransportMode,
  AttractionIcon,
  ReservationIcon,
  ExpenseCategory,
} from './types';

export const TRANSPORT_STYLES: Record<
  TransportMode,
  { color: string; dashArray?: string; label: string; emoji: string }
> = {
  train: { color: '#2563eb', label: 'Train', emoji: '🚆' },
  foot: { color: '#dc2626', dashArray: '6 8', label: 'By Foot', emoji: '🚶' },
  taxi: { color: '#eab308', label: 'Taxi / Uber', emoji: '🚕' },
  plane: { color: '#16a34a', label: 'Plane', emoji: '✈️' },
  ferry: { color: '#6b7280', label: 'Ferry', emoji: '⛴️' },
  bus: { color: '#f97316', label: 'Bus', emoji: '🚌' },
  car: { color: '#111827', label: 'Rented Car', emoji: '🚗' },
  metro: { color: '#9333ea', label: 'Metro / Subway', emoji: '🚇' },
};

export const EXPENSE_CATEGORY_OPTIONS: {
  value: ExpenseCategory;
  emoji: string;
  label: string;
}[] = [
  { value: 'breakfast', emoji: '🍳', label: 'Breakfast' },
  { value: 'lunch', emoji: '🥗', label: 'Lunch' },
  { value: 'dinner', emoji: '🍽️', label: 'Dinner' },
  { value: 'snacks', emoji: '🍿', label: 'Snacks' },
  { value: 'drinks', emoji: '🍹', label: 'Drinks' },
  { value: 'pharmacy', emoji: '💊', label: 'Pharmacy' },
  { value: 'shopping', emoji: '🛍️', label: 'Small Shopping' },
  { value: 'other', emoji: '📦', label: 'Other' },
];

export function expenseEmoji(c: ExpenseCategory) {
  return EXPENSE_CATEGORY_OPTIONS.find((o) => o.value === c)?.emoji || '📦';
}

export function expenseLabel(c: ExpenseCategory) {
  return EXPENSE_CATEGORY_OPTIONS.find((o) => o.value === c)?.label || c;
}

export const ATTRACTION_ICON_OPTIONS: { value: AttractionIcon; emoji: string; label: string }[] = [
  { value: 'museum', emoji: '🏛️', label: 'Museum' },
  { value: 'restaurant', emoji: '🍽️', label: 'Restaurant' },
  { value: 'park', emoji: '🌳', label: 'Park' },
  { value: 'landmark', emoji: '🗽', label: 'Landmark' },
  { value: 'beach', emoji: '🏖️', label: 'Beach' },
  { value: 'mountain', emoji: '⛰️', label: 'Mountain' },
  { value: 'shopping', emoji: '🛍️', label: 'Shopping' },
  { value: 'nightlife', emoji: '🎉', label: 'Nightlife' },
  { value: 'theater', emoji: '🎭', label: 'Theater' },
  { value: 'church', emoji: '⛪', label: 'Church' },
  { value: 'zoo', emoji: '🦁', label: 'Zoo' },
  { value: 'viewpoint', emoji: '🌄', label: 'Viewpoint' },
  { value: 'other', emoji: '📍', label: 'Other' },
];

export const RESERVATION_ICON_OPTIONS: {
  value: ReservationIcon;
  emoji: string;
  label: string;
}[] = [
  { value: 'none', emoji: '—', label: 'None' },
  { value: 'hotel', emoji: '🏨', label: 'Hotel' },
  { value: 'airbnb', emoji: '🏠', label: 'Airbnb' },
  { value: 'museum', emoji: '🎫', label: 'Museum' },
  { value: 'restaurant', emoji: '🍴', label: 'Restaurant' },
  { value: 'guided', emoji: '🧭', label: 'Guided Trip' },
  { value: 'boat', emoji: '⛵', label: 'Boat Ride' },
];

export function attractionEmoji(icon: AttractionIcon) {
  return ATTRACTION_ICON_OPTIONS.find((o) => o.value === icon)?.emoji || '📍';
}

export function reservationEmoji(icon: ReservationIcon) {
  return RESERVATION_ICON_OPTIONS.find((o) => o.value === icon)?.emoji || '';
}

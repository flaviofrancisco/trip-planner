import * as XLSX from 'xlsx';
import type { Trip } from '../types';
import { TRANSPORT_STYLES, expenseLabel } from '../constants';
import { formatVisitAt, toDateInput } from './date';
import { formatMoney } from './currency';

export function exportTripToXlsx(trip: Trip) {
  const wb = XLSX.utils.book_new();
  const currency = trip.currency || 'EUR';

  // --- Cities sheet ---
  const citiesRows = trip.cities.map((c) => ({
    Order: c.cityNumber,
    City: c.name,
    Arrival: toDateInput(c.startDate),
    Departure: toDateInput(c.endDate),
    Latitude: c.coordinates.lat,
    Longitude: c.coordinates.lng,
    Attractions: c.attractions.length,
    'Attractions Cost': formatMoney(
      c.attractions.reduce(
        (s, a) => s + (a.isFree ? 0 : Number(a.cost) || 0),
        0
      ),
      currency
    ),
    'Intra-city Transport': formatMoney(
      c.legs.reduce((s, l) => s + (Number(l.cost) || 0), 0),
      currency
    ),
    Notes: c.notes,
  }));
  const citiesWs = XLSX.utils.json_to_sheet(citiesRows);
  XLSX.utils.book_append_sheet(wb, citiesWs, 'Cities');

  // --- Attractions sheet (all cities, flattened) ---
  const attractionsRows: any[] = [];
  for (const c of trip.cities) {
    for (const a of c.attractions) {
      attractionsRows.push({
        City: c.name,
        Order: a.attractionNumber,
        Name: a.poiName,
        When: formatVisitAt(a.visitAt),
        Type: a.attractionTypeIcon,
        Reservation: a.reservationIcon === 'none' ? '' : a.reservationIcon,
        Latitude: a.coordinates.lat,
        Longitude: a.coordinates.lng,
        Cost: a.isFree ? 'Free' : formatMoney(Number(a.cost) || 0, currency),
        Rating: a.rating || '',
        Notes: a.notes,
      });
    }
  }
  if (attractionsRows.length) {
    const ws = XLSX.utils.json_to_sheet(attractionsRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Attractions');
  }

  // --- Inter-city transport ---
  const cityNumberById = new Map(trip.cities.map((c) => [c.id, c.cityNumber]));
  const cityNameById = new Map(trip.cities.map((c) => [c.id, c.name]));
  const interRows = trip.legs.map((l) => ({
    From: `${cityNumberById.get(l.fromCityId) ?? '?'} · ${
      cityNameById.get(l.fromCityId) ?? l.fromCityId
    }`,
    To: `${cityNumberById.get(l.toCityId) ?? '?'} · ${
      cityNameById.get(l.toCityId) ?? l.toCityId
    }`,
    Transport: TRANSPORT_STYLES[l.transportMode]?.label || l.transportMode,
    Cost: formatMoney(Number(l.cost) || 0, currency),
  }));
  if (interRows.length) {
    const ws = XLSX.utils.json_to_sheet(interRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Inter-city Transport');
  }

  // --- Intra-city transport (all cities) ---
  const intraRows: any[] = [];
  for (const c of trip.cities) {
    const byId = new Map(c.attractions.map((a) => [a.id, a]));
    for (const l of c.legs) {
      const from = byId.get(l.fromAttractionId);
      const to = byId.get(l.toAttractionId);
      intraRows.push({
        City: c.name,
        From: from
          ? `${from.attractionNumber} · ${from.poiName}`
          : l.fromAttractionId,
        To: to ? `${to.attractionNumber} · ${to.poiName}` : l.toAttractionId,
        Transport: TRANSPORT_STYLES[l.transportMode]?.label || l.transportMode,
        Cost: formatMoney(Number(l.cost) || 0, currency),
      });
    }
  }
  if (intraRows.length) {
    const ws = XLSX.utils.json_to_sheet(intraRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Intra-city Transport');
  }

  // --- Expenses (trip-level + city-level, flattened with a Scope column) ---
  const expenses = trip.expenses || [];
  const expRows: any[] = expenses.map((e) => ({
    Scope: 'Trip',
    City: '',
    Date: toDateInput(e.date),
    Category: expenseLabel(e.category),
    Description: e.description,
    Cost: formatMoney(Number(e.cost) || 0, currency),
  }));
  for (const c of trip.cities) {
    for (const e of c.expenses || []) {
      expRows.push({
        Scope: 'City',
        City: c.name,
        Date: toDateInput(e.date),
        Category: expenseLabel(e.category),
        Description: e.description,
        Cost: formatMoney(Number(e.cost) || 0, currency),
      });
    }
  }
  if (expRows.length) {
    const ws = XLSX.utils.json_to_sheet(expRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
  }

  // --- Summary ---
  const attractionsCost = trip.cities.reduce(
    (s, c) =>
      s + c.attractions.reduce(
        (cs, a) => cs + (a.isFree ? 0 : Number(a.cost) || 0),
        0
      ),
    0
  );
  const intraCost = trip.cities.reduce(
    (s, c) => s + c.legs.reduce((cs, l) => cs + (Number(l.cost) || 0), 0),
    0
  );
  const interCost = trip.legs.reduce(
    (s, l) => s + (Number(l.cost) || 0),
    0
  );
  const tripExpensesCost = expenses.reduce(
    (s, e) => s + (Number(e.cost) || 0),
    0
  );
  const cityExpensesCost = trip.cities.reduce(
    (s, c) =>
      s + (c.expenses || []).reduce((es, e) => es + (Number(e.cost) || 0), 0),
    0
  );
  const expensesCost = tripExpensesCost + cityExpensesCost;
  const summary = [
    { Field: 'Title', Value: trip.title },
    { Field: 'Currency', Value: currency },
    { Field: 'Cities', Value: trip.cities.length },
    {
      Field: 'Attractions Cost',
      Value: formatMoney(attractionsCost, currency),
    },
    {
      Field: 'Intra-city Transport',
      Value: formatMoney(intraCost, currency),
    },
    {
      Field: 'Inter-city Transport',
      Value: formatMoney(interCost, currency),
    },
    {
      Field: 'Extra Expenses (trip)',
      Value: formatMoney(tripExpensesCost, currency),
    },
    {
      Field: 'Extra Expenses (cities)',
      Value: formatMoney(cityExpensesCost, currency),
    },
    { Field: 'Extra Expenses (total)', Value: formatMoney(expensesCost, currency) },
    {
      Field: 'Total Estimated Cost',
      Value: formatMoney(trip.totalCost, currency),
    },
    { Field: 'Updated', Value: trip.updatedAt },
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(summary),
    'Summary'
  );

  const safeTitle =
    trip.title.replace(/[^a-z0-9\-_ ]/gi, '_').slice(0, 60) || 'trip';
  XLSX.writeFile(wb, `${safeTitle}.xlsx`);
}

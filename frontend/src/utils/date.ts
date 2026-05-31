/**
 * Dates and date-times are stored as wall-clock strings — no timezone math.
 * Accepted shapes:
 *   "YYYY-MM-DD"
 *   "YYYY-MM-DDTHH:mm"  (with optional :ss and trailing Z, both stripped on read)
 * Legacy ISO-with-Z strings still parse correctly (we only inspect the first 16 chars).
 */

const DATE_RE = /^(\d{4}-\d{2}-\d{2})/;
const TIME_RE = /^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/;

/** Extract "YYYY-MM-DD" portion for <input type="date">. */
export function toDateInput(d: string | null | undefined): string {
  if (!d) return '';
  const m = String(d).match(DATE_RE);
  return m ? m[1] : '';
}

/** Extract "HH:mm" portion for <input type="time">, empty if not present. */
export function toTimeInput(d: string | null | undefined): string {
  if (!d) return '';
  const m = String(d).match(TIME_RE);
  return m ? m[1] : '';
}

/** Combine date + time → "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm". Empty date → null. */
export function combineDateTime(
  date: string,
  time?: string
): string | null {
  if (!date) return null;
  return time ? `${date}T${time}` : date;
}

/** Pass-through for date-only inputs (kept for back-compat with existing callers). */
export function dateInputToISO(local: string): string | null {
  if (!local) return null;
  return local;
}

/** Human-readable: "YYYY-MM-DD" or "YYYY-MM-DD · HH:mm". */
export function formatVisitAt(d: string | null | undefined): string {
  const date = toDateInput(d);
  if (!date) return '';
  const time = toTimeInput(d);
  return time ? `${date} · ${time}` : date;
}

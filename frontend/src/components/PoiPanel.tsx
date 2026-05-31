import { useEffect, useState } from 'react';
import { Calendar, Star, Trash2, X } from 'lucide-react';
import type { Attraction } from '../types';
import {
  ATTRACTION_ICON_OPTIONS,
  RESERVATION_ICON_OPTIONS,
} from '../constants';
import { combineDateTime, toDateInput, toTimeInput } from '../utils/date';
import { currencySymbol } from '../utils/currency';
import { useConfirm } from '../context/ConfirmContext';

export function PoiPanel({
  attraction,
  canEdit,
  currency,
  onSave,
  onDelete,
  onClose,
}: {
  attraction: Attraction;
  canEdit: boolean;
  currency: string;
  onSave: (data: Partial<Attraction>) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const confirm = useConfirm();
  const [draft, setDraft] = useState<Attraction>(attraction);
  const [costInput, setCostInput] = useState<string>(
    attraction.cost ? String(attraction.cost) : ''
  );
  const [latInput, setLatInput] = useState<string>(
    String(attraction.coordinates.lat)
  );
  const [lngInput, setLngInput] = useState<string>(
    String(attraction.coordinates.lng)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(attraction);
    setCostInput(attraction.cost ? String(attraction.cost) : '');
    setLatInput(String(attraction.coordinates.lat));
    setLngInput(String(attraction.coordinates.lng));
  }, [attraction.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (patch: Partial<Attraction>) => {
    setSaving(true);
    setError('');
    try {
      await onSave(patch);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onBlurField = () => {
    if (!canEdit) return;
    const patch: Partial<Attraction> = {};
    if (draft.poiName !== attraction.poiName) patch.poiName = draft.poiName;
    if (draft.notes !== attraction.notes) patch.notes = draft.notes;
    if (draft.cost !== attraction.cost) patch.cost = draft.cost;
    if (Object.keys(patch).length) save(patch);
  };

  const onBlurCoords = () => {
    if (!canEdit) return;
    const lat = Number(latInput);
    const lng = Number(lngInput);
    const latValid = Number.isFinite(lat) && lat >= -90 && lat <= 90;
    const lngValid = Number.isFinite(lng) && lng >= -180 && lng <= 180;
    if (!latValid || !lngValid) {
      setError('Latitude must be -90..90 and longitude must be -180..180');
      setLatInput(String(attraction.coordinates.lat));
      setLngInput(String(attraction.coordinates.lng));
      return;
    }
    if (
      lat === attraction.coordinates.lat &&
      lng === attraction.coordinates.lng
    ) {
      return;
    }
    setDraft({ ...draft, coordinates: { lat, lng } });
    save({ coordinates: { lat, lng } });
  };

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Attraction {attraction.attractionNumber}
          </div>
          <input
            className="input mt-1 text-lg font-semibold"
            value={draft.poiName}
            onChange={(e) => setDraft({ ...draft, poiName: e.target.value })}
            onBlur={onBlurField}
            disabled={!canEdit}
          />
        </div>
        <button className="btn-ghost" onClick={onClose} title="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="label">Coordinates</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="input"
            type="number"
            step="0.0001"
            min={-90}
            max={90}
            placeholder="Latitude"
            value={latInput}
            onChange={(e) => setLatInput(e.target.value)}
            onBlur={onBlurCoords}
            disabled={!canEdit}
          />
          <input
            className="input"
            type="number"
            step="0.0001"
            min={-180}
            max={180}
            placeholder="Longitude"
            value={lngInput}
            onChange={(e) => setLngInput(e.target.value)}
            onBlur={onBlurCoords}
            disabled={!canEdit}
          />
        </div>
      </div>

      <div>
        <label className="label">Attraction type</label>
        <div className="flex flex-wrap gap-1">
          {ATTRACTION_ICON_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              disabled={!canEdit}
              className={`px-2 py-1 rounded-md text-sm border transition-colors ${
                draft.attractionTypeIcon === o.value
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              onClick={() => {
                setDraft({ ...draft, attractionTypeIcon: o.value });
                save({ attractionTypeIcon: o.value });
              }}
              title={o.label}
            >
              {o.emoji}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Reservation</label>
        <div className="flex flex-wrap gap-1">
          {RESERVATION_ICON_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              disabled={!canEdit}
              className={`px-2 py-1 rounded-md text-xs border transition-colors flex items-center gap-1 ${
                draft.reservationIcon === o.value
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              onClick={() => {
                setDraft({ ...draft, reservationIcon: o.value });
                save({ reservationIcon: o.value });
              }}
              title={o.label}
            >
              {o.emoji} {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> When
          </span>
          {draft.visitAt && canEdit && (
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-red-600"
              onClick={() => {
                setDraft({ ...draft, visitAt: null });
                save({ visitAt: null });
              }}
            >
              Clear
            </button>
          )}
        </label>
        <div className="grid grid-cols-[1fr_120px] gap-2">
          <input
            type="date"
            className="input"
            placeholder="YYYY-MM-DD"
            value={toDateInput(draft.visitAt)}
            disabled={!canEdit}
            onChange={(e) => {
              const next = combineDateTime(
                e.target.value,
                toTimeInput(draft.visitAt)
              );
              setDraft({ ...draft, visitAt: next });
              save({ visitAt: next });
            }}
          />
          <input
            type="time"
            className="input"
            value={toTimeInput(draft.visitAt)}
            disabled={!canEdit || !toDateInput(draft.visitAt)}
            title={
              toDateInput(draft.visitAt) ? 'Time of visit' : 'Pick a date first'
            }
            onChange={(e) => {
              const next = combineDateTime(
                toDateInput(draft.visitAt),
                e.target.value
              );
              setDraft({ ...draft, visitAt: next });
              save({ visitAt: next });
            }}
          />
        </div>
      </div>

      <div>
        <label className="label">Notes — what I want to see and do</label>
        <textarea
          className="input min-h-[100px]"
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          onBlur={onBlurField}
          disabled={!canEdit}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Cost ({currencySymbol(currency)})</label>
          <input
            className="input"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={draft.isFree ? '' : costInput}
            onChange={(e) => {
              const v = e.target.value;
              setCostInput(v);
              const n = v === '' ? 0 : Number(v);
              if (!Number.isNaN(n)) setDraft({ ...draft, cost: n });
            }}
            onBlur={onBlurField}
            disabled={!canEdit || draft.isFree}
          />
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.isFree}
              disabled={!canEdit}
              onChange={(e) => {
                setDraft({ ...draft, isFree: e.target.checked });
                save({ isFree: e.target.checked });
              }}
            />
            Free
          </label>
        </div>
      </div>

      <div>
        <label className="label">Rating (post-visit)</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              disabled={!canEdit}
              onClick={() => {
                const newRating = draft.rating === n ? 0 : n;
                setDraft({ ...draft, rating: newRating });
                save({ rating: newRating });
              }}
              className="p-1"
              title={`${n} stars`}
            >
              <Star
                className={`w-5 h-5 transition-transform ${
                  n <= draft.rating
                    ? 'fill-yellow-400 text-yellow-400 scale-110'
                    : 'text-slate-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {error && <div className="text-xs text-red-600">{error}</div>}
      {saving && <div className="text-xs text-slate-500">Saving…</div>}

      {canEdit && (
        <button
          className="btn-danger w-full"
          onClick={async () => {
            const ok = await confirm({
              title: 'Delete this attraction?',
              message: `Attraction ${attraction.attractionNumber}: “${attraction.poiName}” will be removed, along with any intra-city transport connected to it.`,
              confirmText: 'Delete',
              danger: true,
            });
            if (ok) await onDelete();
          }}
        >
          <Trash2 className="w-4 h-4" /> Delete attraction
        </button>
      )}
    </div>
  );
}

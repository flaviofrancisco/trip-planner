import { useEffect, useState } from 'react';
import { ArrowRight, Calendar, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { City } from '../types';
import { dateInputToISO, toDateInput } from '../utils/date';
import { useConfirm } from '../context/ConfirmContext';

export function CityDetailPanel({
  tripId,
  city,
  canEdit,
  onSave,
  onDelete,
  onClose,
}: {
  tripId: string;
  city: City;
  canEdit: boolean;
  onSave: (patch: {
    name?: string;
    notes?: string;
    startDate?: string | null;
    endDate?: string | null;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const confirm = useConfirm();
  const [name, setName] = useState(city.name);
  const [notes, setNotes] = useState(city.notes || '');
  const [start, setStart] = useState(toDateInput(city.startDate));
  const [end, setEnd] = useState(toDateInput(city.endDate));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(city.name);
    setNotes(city.notes || '');
    setStart(toDateInput(city.startDate));
    setEnd(toDateInput(city.endDate));
  }, [city.id]);

  const commit = async (patch: any) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await onSave(patch);
    } finally {
      setSaving(false);
    }
  };

  const onBlurField = () => {
    const patch: any = {};
    if (name !== city.name) patch.name = name;
    if (notes !== (city.notes || '')) patch.notes = notes;
    if (Object.keys(patch).length) commit(patch);
  };

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            City {city.cityNumber}
          </div>
          <input
            className="input mt-1 text-lg font-semibold"
            value={name}
            disabled={!canEdit}
            onChange={(e) => setName(e.target.value)}
            onBlur={onBlurField}
          />
        </div>
        <button className="btn-ghost" onClick={onClose} title="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="text-xs text-slate-500">
        {city.coordinates.lat.toFixed(4)}, {city.coordinates.lng.toFixed(4)}
      </div>

      <Link
        to={`/trips/${tripId}/cities/${city.id}`}
        className="btn-primary w-full"
      >
        Open this city <ArrowRight className="w-4 h-4" />
      </Link>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Arrival
          </label>
          <input
            type="date"
            className="input"
            value={start}
            disabled={!canEdit}
            onChange={(e) => {
              const v = e.target.value;
              setStart(v);
              commit({ startDate: dateInputToISO(v) });
            }}
          />
        </div>
        <div>
          <label className="label flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Departure
          </label>
          <input
            type="date"
            className="input"
            value={end}
            disabled={!canEdit}
            onChange={(e) => {
              const v = e.target.value;
              setEnd(v);
              commit({ endDate: dateInputToISO(v) });
            }}
          />
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea
          className="input min-h-[80px]"
          value={notes}
          disabled={!canEdit}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={onBlurField}
        />
      </div>

      {saving && <div className="text-xs text-slate-500">Saving…</div>}

      {canEdit && (
        <button
          className="btn-danger w-full"
          onClick={async () => {
            const ok = await confirm({
              title: 'Delete this city?',
              message: `“${city.name}” and all its attractions and intra-city transport will be removed from this trip.`,
              confirmText: 'Delete city',
              danger: true,
            });
            if (ok) await onDelete();
          }}
        >
          <Trash2 className="w-4 h-4" /> Delete city
        </button>
      )}
    </div>
  );
}

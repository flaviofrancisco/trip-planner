import { useEffect, useState } from 'react';
import { ArrowRight, Plus, Trash2, X } from 'lucide-react';
import type { TransportMode } from '../types';
import { TRANSPORT_STYLES } from '../constants';
import { currencySymbol } from '../utils/currency';

export interface RouteStop {
  id: string;
  number: number;
  label: string;
}

export interface RouteEntry {
  id: string;
  fromId: string;
  toId: string;
  transportMode: TransportMode;
  cost: number;
}

export function RoutesList({
  emptyHint,
  stops,
  routes,
  canEdit,
  currency,
  onCreate,
  onUpdate,
  onDelete,
}: {
  emptyHint: string;
  stops: RouteStop[];
  routes: RouteEntry[];
  canEdit: boolean;
  currency: string;
  onCreate: (
    fromId: string,
    toId: string,
    transportMode: TransportMode,
    cost?: number
  ) => Promise<void>;
  onUpdate: (
    legId: string,
    patch: { transportMode?: TransportMode; cost?: number }
  ) => Promise<void>;
  onDelete: (legId: string) => Promise<void>;
}) {
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [draftMode, setDraftMode] = useState<TransportMode | ''>('');

  const resetDraft = () => {
    setDraftOpen(false);
    setDraftFrom('');
    setDraftTo('');
    setDraftMode('');
  };

  const saveDraft = async () => {
    if (!draftFrom || !draftTo || draftFrom === draftTo || !draftMode) return;
    await onCreate(draftFrom, draftTo, draftMode);
    resetDraft();
  };

  const swapFromTo = async (route: RouteEntry, newFromId: string, newToId: string) => {
    if (!newFromId || !newToId || newFromId === newToId) return;
    if (newFromId === route.fromId && newToId === route.toId) return;
    await onDelete(route.id);
    await onCreate(newFromId, newToId, route.transportMode, route.cost);
  };

  const stopOption = (s: RouteStop) => `#${s.number} ${s.label}`;
  const enoughStops = stops.length >= 2;

  return (
    <div className="space-y-2">
      {canEdit && enoughStops && !draftOpen && (
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => setDraftOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" /> Add route
          </button>
        </div>
      )}

      {routes.length === 0 && !draftOpen && (
        <div className="text-xs text-slate-500">
          {enoughStops ? emptyHint : 'Add at least two stops to create a route.'}
        </div>
      )}

      <div className="space-y-2">
        {routes.map((route) => (
          <RouteRow
            key={route.id}
            route={route}
            stops={stops}
            currency={currency}
            canEdit={canEdit}
            onChangeFrom={(fromId) => swapFromTo(route, fromId, route.toId)}
            onChangeTo={(toId) => swapFromTo(route, route.fromId, toId)}
            onChangeMode={(mode) => onUpdate(route.id, { transportMode: mode })}
            onChangeCost={(cost) => onUpdate(route.id, { cost })}
            onDelete={() => onDelete(route.id)}
          />
        ))}

        {draftOpen && (
          <div className="space-y-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-md p-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                className="input py-1 text-xs flex-1 min-w-0"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
              >
                <option value="">— from —</option>
                {stops.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === draftTo}>
                    {stopOption(s)}
                  </option>
                ))}
              </select>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <select
                className="input py-1 text-xs flex-1 min-w-0"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
              >
                <option value="">— to —</option>
                {stops.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === draftFrom}>
                    {stopOption(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                className="input py-1 text-xs flex-1 min-w-0"
                value={draftMode}
                onChange={(e) => setDraftMode(e.target.value as TransportMode)}
              >
                <option value="">— transport —</option>
                {Object.entries(TRANSPORT_STYLES).map(([key, s]) => (
                  <option key={key} value={key}>
                    {s.emoji} {s.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-primary text-xs"
                onClick={saveDraft}
                disabled={
                  !draftFrom || !draftTo || draftFrom === draftTo || !draftMode
                }
              >
                Save
              </button>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={resetDraft}
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RouteRow({
  route,
  stops,
  currency,
  canEdit,
  onChangeFrom,
  onChangeTo,
  onChangeMode,
  onChangeCost,
  onDelete,
}: {
  route: RouteEntry;
  stops: RouteStop[];
  currency: string;
  canEdit: boolean;
  onChangeFrom: (fromId: string) => Promise<void>;
  onChangeTo: (toId: string) => Promise<void>;
  onChangeMode: (mode: TransportMode) => Promise<void>;
  onChangeCost: (cost: number) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [costText, setCostText] = useState<string>(
    route.cost ? String(route.cost) : ''
  );

  useEffect(() => {
    setCostText(route.cost ? String(route.cost) : '');
  }, [route.id, route.cost]);

  const commitCost = () => {
    if (!canEdit) return;
    const n = costText === '' ? 0 : Number(costText);
    if (Number.isNaN(n) || n < 0) {
      setCostText(route.cost ? String(route.cost) : '');
      return;
    }
    if (n !== route.cost) onChangeCost(n);
  };

  const stopOption = (s: RouteStop) => `#${s.number} ${s.label}`;

  return (
    <div className="space-y-1.5 border border-slate-200 dark:border-slate-700 rounded-md p-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <select
          className="input py-1 text-xs flex-1 min-w-0"
          value={route.fromId}
          disabled={!canEdit}
          onChange={(e) => onChangeFrom(e.target.value)}
        >
          {stops.map((s) => (
            <option key={s.id} value={s.id} disabled={s.id === route.toId}>
              {stopOption(s)}
            </option>
          ))}
        </select>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <select
          className="input py-1 text-xs flex-1 min-w-0"
          value={route.toId}
          disabled={!canEdit}
          onChange={(e) => onChangeTo(e.target.value)}
        >
          {stops.map((s) => (
            <option key={s.id} value={s.id} disabled={s.id === route.fromId}>
              {stopOption(s)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <select
          className="input py-1 text-xs flex-1 min-w-0"
          value={route.transportMode}
          disabled={!canEdit}
          onChange={(e) => onChangeMode(e.target.value as TransportMode)}
        >
          {Object.entries(TRANSPORT_STYLES).map(([key, s]) => (
            <option key={key} value={key}>
              {s.emoji} {s.label}
            </option>
          ))}
        </select>
        <div className="relative w-24 flex-shrink-0">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
            {currencySymbol(currency)}
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input py-1 text-xs pl-5"
            placeholder="0"
            value={costText}
            disabled={!canEdit}
            onChange={(e) => setCostText(e.target.value)}
            onBlur={commitCost}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
        {canEdit && (
          <button
            type="button"
            className="btn-ghost text-red-500 hover:text-red-700 p-1"
            onClick={() => onDelete()}
            title="Delete route"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

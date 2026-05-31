import { Fragment, useEffect, useState } from 'react';
import { Calendar, GripVertical, Star } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Attraction, City, IntraLeg, TransportMode, Trip } from '../types';
import {
  TRANSPORT_STYLES,
  attractionEmoji,
  reservationEmoji,
} from '../constants';
import { currencySymbol, formatMoney } from '../utils/currency';
import { formatVisitAt } from '../utils/date';

export function AttractionsList({
  trip,
  city,
  canEdit,
  selectedAttractionId,
  onSelectAttraction,
  onChangeLeg,
  onReorder,
}: {
  trip: Trip;
  city: City;
  canEdit: boolean;
  selectedAttractionId?: string;
  onSelectAttraction: (attractionId: string) => void;
  onChangeLeg: (
    fromAttractionId: string,
    toAttractionId: string,
    patch: { transportMode?: TransportMode; cost?: number },
    existingLegId?: string
  ) => Promise<void>;
  onReorder: (order: string[]) => Promise<void>;
}) {
  const currency = trip.currency || 'EUR';
  const [items, setItems] = useState<Attraction[]>(city.attractions);

  useEffect(() => {
    setItems(city.attractions);
  }, [city.attractions]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const legByPair = new Map<string, IntraLeg>();
  city.legs.forEach((l) =>
    legByPair.set(`${l.fromAttractionId}->${l.toAttractionId}`, l)
  );

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((a) => a.id === active.id);
    const newIndex = items.findIndex((a) => a.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    await onReorder(next.map((a) => a.id));
  };

  if (items.length === 0) {
    return (
      <div className="card p-6 text-sm text-slate-500 text-center">
        No attractions in {city.name} yet. Add one using the form on the left.
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((att, idx) => {
            const next = items[idx + 1];
            const leg = next ? legByPair.get(`${att.id}->${next.id}`) : null;
            return (
              <Fragment key={att.id}>
                <SortableAttractionRow
                  attraction={att}
                  currency={currency}
                  selected={att.id === selectedAttractionId}
                  canEdit={canEdit}
                  onClick={() => onSelectAttraction(att.id)}
                />
                {next && (
                  <div className="flex items-center gap-2 pl-3 pr-1 py-1 my-1">
                    <span className="text-xs text-slate-500 w-16 flex-shrink-0">
                      → #{next.attractionNumber}
                    </span>
                    <select
                      className="input py-1 text-xs flex-1 min-w-0"
                      value={leg?.transportMode ?? ''}
                      disabled={!canEdit}
                      onChange={(e) => {
                        const mode = e.target.value as TransportMode;
                        if (!mode) return;
                        onChangeLeg(
                          att.id,
                          next.id,
                          { transportMode: mode },
                          leg?.id
                        );
                      }}
                    >
                      <option value="">— transport —</option>
                      {Object.entries(TRANSPORT_STYLES).map(([key, s]) => (
                        <option key={key} value={key}>
                          {s.emoji} {s.label}
                        </option>
                      ))}
                    </select>
                    <LegCostInput
                      legId={leg?.id}
                      cost={leg?.cost ?? 0}
                      canEdit={canEdit && !!leg}
                      currency={currency}
                      onChange={(c) =>
                        leg && onChangeLeg(att.id, next.id, { cost: c }, leg.id)
                      }
                    />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableAttractionRow({
  attraction,
  currency,
  selected,
  canEdit,
  onClick,
}: {
  attraction: Attraction;
  currency: string;
  selected: boolean;
  canEdit: boolean;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: attraction.id, disabled: !canEdit });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <button
        onClick={onClick}
        className={`w-full text-left card-hover p-3 flex items-center gap-2 transition-all ${
          selected
            ? 'ring-2 ring-brand-500 border-brand-300 dark:border-brand-600'
            : ''
        } ${isDragging ? 'shadow-lg' : ''}`}
      >
        {canEdit && (
          <span
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing p-0.5 -ml-1 flex-shrink-0"
            title="Drag to reorder"
            aria-label="Drag handle"
            role="button"
            tabIndex={0}
          >
            <GripVertical className="w-4 h-4" />
          </span>
        )}
        <div className="poi-marker !relative !w-9 !h-9 text-sm flex-shrink-0">
          <span className="flex flex-col items-center leading-none">
            <span className="text-[10px]">{attraction.attractionNumber}</span>
            <span>{attractionEmoji(attraction.attractionTypeIcon)}</span>
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {attraction.poiName}{' '}
            {attraction.reservationIcon !== 'none' && (
              <span title="Reservation">
                {reservationEmoji(attraction.reservationIcon)}
              </span>
            )}
          </div>
          {attraction.visitAt && (
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatVisitAt(attraction.visitAt)}</span>
            </div>
          )}
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>
              {attraction.isFree
                ? 'Free'
                : formatMoney(Number(attraction.cost) || 0, currency)}
            </span>
            {attraction.rating > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {attraction.rating}
              </span>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

function LegCostInput({
  legId,
  cost,
  canEdit,
  currency,
  onChange,
}: {
  legId: string | undefined;
  cost: number;
  canEdit: boolean;
  currency: string;
  onChange: (cost: number) => void;
}) {
  const [value, setValue] = useState<string>(cost ? String(cost) : '');

  useEffect(() => {
    setValue(cost ? String(cost) : '');
  }, [legId, cost]);

  const commit = () => {
    if (!canEdit) return;
    const n = value === '' ? 0 : Number(value);
    if (Number.isNaN(n) || n < 0) {
      setValue(cost ? String(cost) : '');
      return;
    }
    if (n !== cost) onChange(n);
  };

  return (
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
        value={value}
        disabled={!canEdit}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
    </div>
  );
}

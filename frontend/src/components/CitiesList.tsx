import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, GripVertical, MapPin } from 'lucide-react';
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
import type { City, Trip } from '../types';
import { formatMoney } from '../utils/currency';
import { formatVisitAt } from '../utils/date';

export function CitiesList({
  trip,
  canEdit,
  selectedCityId,
  onSelectCity,
  onReorder,
}: {
  trip: Trip;
  canEdit: boolean;
  selectedCityId?: string;
  onSelectCity: (cityId: string) => void;
  onReorder: (order: string[]) => Promise<void>;
}) {
  const [items, setItems] = useState<City[]>(trip.cities);

  useEffect(() => {
    setItems(trip.cities);
  }, [trip.cities]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((c) => c.id === active.id);
    const newIndex = items.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    await onReorder(next.map((c) => c.id));
  };

  if (items.length === 0) {
    return (
      <div className="text-sm text-slate-500 text-center py-4">
        <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        Add the cities you plan to visit using the form above.
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((city) => {
            const cityCost =
              city.attractions.reduce(
                (s, a) => s + (a.isFree ? 0 : Number(a.cost) || 0),
                0
              ) +
              city.legs.reduce((s, l) => s + (Number(l.cost) || 0), 0);
            return (
              <SortableCityCard
                key={city.id}
                trip={trip}
                city={city}
                cityCost={cityCost}
                selected={city.id === selectedCityId}
                canEdit={canEdit}
                onClick={() => onSelectCity(city.id)}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableCityCard({
  trip,
  city,
  cityCost,
  selected,
  canEdit,
  onClick,
}: {
  trip: Trip;
  city: City;
  cityCost: number;
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
  } = useSortable({ id: city.id, disabled: !canEdit });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };
  const currency = trip.currency || 'EUR';

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`card-hover p-3 cursor-pointer transition-all ${
          selected
            ? 'ring-2 ring-brand-500 border-brand-300 dark:border-brand-600'
            : ''
        } ${isDragging ? 'shadow-lg' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-start gap-2">
          {canEdit && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing p-0.5 -ml-1"
              title="Drag to reorder"
              aria-label="Drag handle"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          <div className="city-marker !static">
            <span className="num">{city.cityNumber}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold truncate">{city.name}</div>
              <Link
                to={`/trips/${trip.id}/cities/${city.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-brand-600 hover:underline flex-shrink-0 flex items-center gap-0.5"
              >
                Open <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {(city.startDate || city.endDate) && (
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3" />
                {formatVisitAt(city.startDate)}
                {city.endDate ? ` → ${formatVisitAt(city.endDate)}` : ''}
              </div>
            )}
            <div className="flex items-center gap-2 mt-1.5 text-xs">
              <span className="pill">
                {city.attractions.length} attraction
                {city.attractions.length === 1 ? '' : 's'}
              </span>
              {cityCost > 0 && (
                <span className="pill-brand">{formatMoney(cityCost, currency)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

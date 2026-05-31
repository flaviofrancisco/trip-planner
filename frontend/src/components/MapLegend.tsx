import { TRANSPORT_STYLES } from '../constants';

export function MapLegend() {
  return (
    <div className="card p-3 text-xs">
      <div className="font-semibold mb-2">Transport legend</div>
      <ul className="space-y-1.5">
        {Object.entries(TRANSPORT_STYLES).map(([key, style]) => (
          <li key={key} className="flex items-center gap-2">
            <span
              className="inline-block w-8 h-0.5"
              style={{
                background:
                  style.dashArray && style.dashArray.length > 0
                    ? `repeating-linear-gradient(to right, ${style.color} 0 4px, transparent 4px 7px)`
                    : style.color,
                height: 3,
              }}
            />
            <span className="flex-1">
              {style.emoji} {style.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

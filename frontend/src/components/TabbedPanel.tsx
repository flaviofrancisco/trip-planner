import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface PanelTab {
  key: string;
  label: string;
  badge?: number | string;
  content: ReactNode;
}

export function TabbedPanel({
  tabs,
  defaultTab,
  defaultCollapsed = false,
}: {
  tabs: PanelTab[];
  defaultTab?: string;
  defaultCollapsed?: boolean;
}) {
  const firstKey = tabs[0]?.key ?? '';
  const [activeKey, setActiveKey] = useState(defaultTab ?? firstKey);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const activeTab = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  return (
    <div className="card overflow-hidden">
      <div className="flex items-stretch border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-1 min-w-0">
          {tabs.map((t) => {
            const isActive = t.key === activeKey;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setActiveKey(t.key);
                  if (collapsed) setCollapsed(false);
                }}
                className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                  isActive
                    ? 'text-brand-600 border-brand-500'
                    : 'text-slate-500 border-transparent hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t.label}
                {t.badge !== undefined && t.badge !== null && t.badge !== '' && (
                  <span className="ml-1.5 text-xs text-slate-400">
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="px-3 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}
          aria-label={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>
      {!collapsed && <div className="p-3">{activeTab?.content}</div>}
    </div>
  );
}

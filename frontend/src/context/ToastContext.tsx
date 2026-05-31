import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 3500) => {
      const id =
        Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      setToasts((ts) => [...ts, { id, variant, message }]);
      if (duration > 0) {
        window.setTimeout(() => remove(id), duration);
      }
    },
    [remove]
  );

  const value: ToastContextValue = {
    show,
    success: (m, d) => show(m, 'success', d),
    error: (m, d) => show(m, 'error', d ?? 5000),
    info: (m, d) => show(m, 'info', d),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-16 right-4 z-[2000] flex flex-col gap-2 max-w-sm w-[min(90vw,22rem)] pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon = {
    success: CheckCircle2,
    error: XCircle,
    info: Info,
    warning: AlertTriangle,
  }[toast.variant];
  const tone = {
    success:
      'bg-green-50 border-green-200 text-green-900 dark:bg-green-950/70 dark:border-green-800 dark:text-green-100',
    error:
      'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/70 dark:border-red-800 dark:text-red-100',
    info: 'bg-slate-50 border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
    warning:
      'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950/70 dark:border-yellow-800 dark:text-yellow-100',
  }[toast.variant];
  return (
    <div
      className={`pointer-events-auto rounded-lg border ${tone} p-3 flex items-start gap-2 shadow-md toast-enter`}
      role="status"
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm break-words">{toast.message}</div>
      <button
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0"
        onClick={onClose}
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

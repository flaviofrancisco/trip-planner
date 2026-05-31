import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface State extends ConfirmOptions {
  open: boolean;
  resolve?: (v: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ open: false, message: '' });

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setState({ ...opts, open: true, resolve });
      }),
    []
  );

  const close = (result: boolean) => {
    state.resolve?.(result);
    setState((s) => ({ ...s, open: false, resolve: undefined }));
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div
          className="fixed inset-0 z-[1500] bg-black/50 flex items-center justify-center p-4"
          onClick={() => close(false)}
        >
          <div
            className="card max-w-sm w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              {state.danger && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {state.title && (
                  <h3 className="font-semibold text-base">{state.title}</h3>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  {state.message}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => close(false)}>
                {state.cancelText || 'Cancel'}
              </button>
              <button
                className={state.danger ? 'btn-danger' : 'btn-primary'}
                onClick={() => close(true)}
                autoFocus
              >
                {state.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}

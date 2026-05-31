import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
interface ThemeContextValue {
  pref: ThemePref;
  effective: 'light' | 'dark';
  setPref: (p: ThemePref) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'tp_theme';

function resolveEffective(p: ThemePref): 'light' | 'dark' {
  if (p === 'system')
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  return p;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePref | null;
    return stored || 'system';
  });
  const [effective, setEffective] = useState<'light' | 'dark'>(() =>
    resolveEffective(pref)
  );

  useEffect(() => {
    const root = document.documentElement;
    if (effective === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [effective]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, pref);
    setEffective(resolveEffective(pref));
    if (pref !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setEffective(resolveEffective('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  const toggle = () => setPrefState(effective === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ pref, effective, setPref: setPrefState, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

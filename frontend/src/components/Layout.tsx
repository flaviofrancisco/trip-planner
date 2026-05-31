import { Link } from 'react-router-dom';
import { LogOut, Moon, Sun, Map, Settings } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SettingsModal } from './SettingsModal';

export function Layout({
  children,
  fullHeight,
}: {
  children: ReactNode;
  fullHeight?: boolean;
}) {
  const { user, logout } = useAuth();
  const { effective, toggle } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <Map className="w-5 h-5 text-brand-600" />
            <span>Trip Planner</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost"
              onClick={toggle}
              title={effective === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {effective === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            {user && (
              <>
                <button
                  className="btn-ghost"
                  onClick={() => setSettingsOpen(true)}
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-400 hidden sm:inline">
                  {user.name}
                </span>
                <button className="btn-ghost" onClick={logout} title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className={fullHeight ? 'flex-1 flex flex-col' : 'flex-1'}>
        {children}
      </main>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

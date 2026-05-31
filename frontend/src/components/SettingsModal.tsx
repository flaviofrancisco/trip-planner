import { useEffect, useState } from 'react';
import { X, KeyRound, Sun, Moon, Monitor } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme, type ThemePref } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, refreshUser } = useAuth();
  const { pref, setPref } = useTheme();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload: any = {};
      if (name && name !== user?.name) payload.name = name;
      if (openaiKey || geminiKey)
        payload.apiKeys = {
          ...(openaiKey ? { openai: openaiKey } : {}),
          ...(geminiKey ? { gemini: geminiKey } : {}),
        };
      payload.preferences = { theme: pref };
      await api.updateMe(payload);
      await refreshUser();
      setOpenaiKey('');
      setGeminiKey('');
      toast.success('Settings saved');
      onClose();
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const clearKey = async (provider: 'openai' | 'gemini') => {
    setSaving(true);
    setError('');
    try {
      await api.updateMe({ apiKeys: { [provider]: '' } as any });
      await refreshUser();
      toast.success(`${provider} key cleared`);
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="card max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Settings</h2>
          <button className="btn-ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="label">Display name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Theme</label>
          <div className="flex gap-2">
            {(
              [
                { v: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
                { v: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
                {
                  v: 'system',
                  icon: <Monitor className="w-4 h-4" />,
                  label: 'System',
                },
              ] as { v: ThemePref; icon: JSX.Element; label: string }[]
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setPref(o.v)}
                className={`btn flex-1 ${
                  pref === o.v ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                {o.icon} {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-4 h-4" />
            <h3 className="font-semibold">AI API Keys</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Keys are stored server-side and used only for your AI requests. Leave a field blank to keep
            the existing key.
          </p>

          <div className="space-y-3">
            <div>
              <label className="label flex items-center justify-between">
                <span>
                  OpenAI{' '}
                  {user?.apiKeys?.openai && (
                    <span className="text-xs text-green-600">(configured)</span>
                  )}
                </span>
                {user?.apiKeys?.openai && (
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => clearKey('openai')}
                  >
                    Clear
                  </button>
                )}
              </label>
              <input
                className="input"
                type="password"
                placeholder="sk-…"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div>
              <label className="label flex items-center justify-between">
                <span>
                  Gemini{' '}
                  {user?.apiKeys?.gemini && (
                    <span className="text-xs text-green-600">(configured)</span>
                  )}
                </span>
                {user?.apiKeys?.gemini && (
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => clearKey('gemini')}
                  >
                    Clear
                  </button>
                )}
              </label>
              <input
                className="input"
                type="password"
                placeholder="AIza…"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

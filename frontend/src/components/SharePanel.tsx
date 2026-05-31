import { useState } from 'react';
import { Share2, Trash2 } from 'lucide-react';
import type { Trip } from '../types';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

export function SharePanel({
  trip,
  onChange,
}: {
  trip: Trip;
  onChange: (t: Trip) => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'viewer' | 'editor'>('viewer');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const updated = await api.shareTrip(trip.id, email.trim(), permission);
      onChange(updated);
      toast.success(`Trip shared with ${email.trim()} (${permission})`);
      setEmail('');
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const removeShare = async (userId: string, label: string) => {
    const ok = await confirm({
      title: 'Remove access?',
      message: `${label} will no longer be able to view or edit this trip.`,
      confirmText: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      const updated = await api.unshareTrip(trip.id, userId);
      onChange(updated);
      toast.success('Access removed');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="card p-3 space-y-2">
      <div className="font-semibold flex items-center gap-2 text-sm">
        <Share2 className="w-4 h-4" /> Sharing
      </div>
      <form onSubmit={submit} className="space-y-2">
        <input
          className="input"
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="flex gap-2">
          <select
            className="input flex-1"
            value={permission}
            onChange={(e) => setPermission(e.target.value as any)}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <button className="btn-primary" disabled={busy}>
            Share
          </button>
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
      </form>
      {trip.sharedWith.length > 0 && (
        <ul className="text-xs space-y-1 pt-1 border-t border-slate-200 dark:border-slate-700">
          {trip.sharedWith.map((s) => (
            <li
              key={s.userId}
              className="flex items-center justify-between gap-2 py-1"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {s.name || s.email || s.userId}
                </div>
                <div className="text-slate-500">{s.permission}</div>
              </div>
              <button
                className="text-slate-400 hover:text-red-600"
                onClick={() =>
                  removeShare(s.userId, s.name || s.email || s.userId)
                }
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, MapPin, Users } from 'lucide-react';
import { api } from '../api';
import type { TripSummary } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { formatMoney } from '../utils/currency';

export function TripsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.listTrips();
      setTrips(list);
      if (list.length && !selectedId) setSelectedId(list[0].id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const trip = await api.createTrip(newTitle.trim());
      toast.success(`Trip “${trip.title}” created`);
      setNewTitle('');
      await load();
      setSelectedId(trip.id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteTrip = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'Delete this trip?',
      message: `“${title}” and all its stops, legs, and expenses will be permanently removed.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteTrip(id);
      toast.success('Trip deleted');
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Trips</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Welcome back, {user?.name}
          </p>
        </div>
        <form onSubmit={createTrip} className="flex gap-2 w-full sm:w-auto">
          <input
            className="input flex-1 sm:w-64"
            placeholder="New trip title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <button className="btn-primary" disabled={creating || !newTitle.trim()}>
            <Plus className="w-4 h-4" /> Create
          </button>
        </form>
      </div>

      {trips.length > 0 && (
        <div className="card p-4 mb-6">
          <label className="label">Quick load a trip</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="input sm:flex-1"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} · {t.cityCount} cit{t.cityCount === 1 ? 'y' : 'ies'} · {t.attractionCount} attraction{t.attractionCount === 1 ? '' : 's'} · {formatMoney(t.totalCost, t.currency)}
                </option>
              ))}
            </select>
            <Link to={`/trips/${selectedId}`} className="btn-primary">
              Open
            </Link>
          </div>
        </div>
      )}

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : trips.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          No trips yet. Create your first one above!
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map((t) => (
            <div key={t.id} className="card p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <Link
                  to={`/trips/${t.id}`}
                  className="font-semibold text-lg hover:text-brand-600 line-clamp-2"
                >
                  {t.title}
                </Link>
                {t.permission === 'owner' && (
                  <button
                    className="text-slate-400 hover:text-red-600"
                    onClick={() => deleteTrip(t.id, t.title)}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-3 mb-3">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {t.cityCount} cit{t.cityCount === 1 ? 'y' : 'ies'} · {t.attractionCount} attr
                </span>
                {t.permission !== 'owner' && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {t.permission}
                  </span>
                )}
              </div>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-sm font-semibold text-brand-600">
                  {formatMoney(t.totalCost, t.currency)}
                </span>
                <Link to={`/trips/${t.id}`} className="btn-secondary">
                  Open
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

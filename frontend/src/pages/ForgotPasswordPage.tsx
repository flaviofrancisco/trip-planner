import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Map } from 'lucide-react';
import { api } from '../api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setDevResetUrl('');
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setMessage(res.message);
      if (res.devResetUrl) setDevResetUrl(res.devResetUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-center mb-6 gap-2">
          <Map className="w-7 h-7 text-brand-600" />
          <h1 className="text-2xl font-bold">Reset credentials</h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Enter your account email. We&apos;ll send a link to confirm it, then you can
          choose new credentials — no previous password needed.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {message && (
            <div className="text-sm text-green-700 dark:text-green-400">{message}</div>
          )}
          {devResetUrl && (
            <div className="text-xs rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 space-y-2">
              <p className="text-amber-900 dark:text-amber-200">
                Email is not configured in development. Use this reset link:
              </p>
              <a
                href={devResetUrl}
                className="break-all text-brand-600 hover:underline"
              >
                {devResetUrl}
              </a>
            </div>
          )}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <p className="text-sm text-center mt-4 text-slate-600 dark:text-slate-400">
          Remember your password?{' '}
          <Link to="/login" className="text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

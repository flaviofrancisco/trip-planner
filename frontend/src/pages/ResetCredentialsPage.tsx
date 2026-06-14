import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Map, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

export function ResetCredentialsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    api
      .verifyResetToken(token)
      .then((res) => {
        setVerified(true);
        setVerifiedEmail(res.email);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setChecking(false));
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.setCredentials(token, password);
      setMessage(res.message);
      setTimeout(() => navigate('/login'), 1500);
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
          <h1 className="text-2xl font-bold">Set new credentials</h1>
        </div>

        {checking && (
          <p className="text-sm text-slate-500 text-center">Confirming your email…</p>
        )}

        {!checking && !token && (
          <div className="space-y-4">
            <p className="text-sm text-red-600">
              This link is invalid. Request a new one below.
            </p>
            <Link
              to="/forgot-password"
              className="btn-primary w-full inline-block text-center"
            >
              Request reset link
            </Link>
          </div>
        )}

        {!checking && token && !verified && (
          <div className="space-y-4">
            <p className="text-sm text-red-600">{error || 'Invalid or expired link.'}</p>
            <Link
              to="/forgot-password"
              className="btn-primary w-full inline-block text-center"
            >
              Request a new link
            </Link>
          </div>
        )}

        {!checking && verified && (
          <>
            <div className="flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-800 dark:text-green-300">
                  Email confirmed
                </p>
                <p className="text-green-700 dark:text-green-400">
                  {verifiedEmail} — choose a new password below.
                </p>
              </div>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="label">New password (min 6 chars)</label>
                <input
                  className="input"
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Confirm new password</label>
                <input
                  className="input"
                  type="password"
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              {error && <div className="text-sm text-red-600">{error}</div>}
              {message && (
                <div className="text-sm text-green-700 dark:text-green-400">{message}</div>
              )}
              <button className="btn-primary w-full" disabled={loading || !!message}>
                {loading ? 'Saving…' : 'Save new credentials'}
              </button>
            </form>
          </>
        )}

        <p className="text-sm text-center mt-4 text-slate-600 dark:text-slate-400">
          <Link to="/login" className="text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

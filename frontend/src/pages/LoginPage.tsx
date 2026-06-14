import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Map } from 'lucide-react';

type LoginMode = 'password' | 'code';

export function LoginPage() {
  const { login, loginWithCode } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [devLoginCode, setDevLoginCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetMessages = () => {
    setError('');
    setMessage('');
    setDevLoginCode('');
  };

  const switchMode = (next: LoginMode) => {
    setMode(next);
    setCodeSent(false);
    setCode('');
    resetMessages();
  };

  const sendCode = async () => {
    resetMessages();
    setLoading(true);
    try {
      const res = await api.requestLoginCode(email);
      setCodeSent(true);
      setMessage(res.message);
      if (res.devLoginCode) setDevLoginCode(res.devLoginCode);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      if (!codeSent) {
        await sendCode();
        return;
      }
      await loginWithCode(email, code);
      navigate('/');
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
          <h1 className="text-2xl font-bold">Trip Planner</h1>
        </div>

        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 mb-4">
          <button
            type="button"
            className={`flex-1 py-1.5 text-sm rounded-md ${
              mode === 'password'
                ? 'bg-brand-600 text-white'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            onClick={() => switchMode('password')}
          >
            Password
          </button>
          <button
            type="button"
            className={`flex-1 py-1.5 text-sm rounded-md ${
              mode === 'code'
                ? 'bg-brand-600 text-white'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            onClick={() => switchMode('code')}
          >
            Email code
          </button>
        </div>

        {mode === 'password' ? (
          <form onSubmit={onSubmitPassword} className="space-y-4">
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
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-brand-600 hover:underline"
                >
                  Forgot credentials?
                </Link>
              </div>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form onSubmit={onSubmitCode} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={codeSent}
              />
            </div>
            {codeSent && (
              <div>
                <label className="label">6-digit code</label>
                <input
                  className="input tracking-[0.3em] text-center font-mono"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
              </div>
            )}
            {message && (
              <div className="text-sm text-green-700 dark:text-green-400">{message}</div>
            )}
            {devLoginCode && (
              <div className="text-xs rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3">
                <p className="text-amber-900 dark:text-amber-200 mb-1">
                  Email is not configured in development. Your sign-in code:
                </p>
                <p className="font-mono text-lg text-brand-600">{devLoginCode}</p>
              </div>
            )}
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading
                ? codeSent
                  ? 'Verifying…'
                  : 'Sending…'
                : codeSent
                  ? 'Sign in with code'
                  : 'Send sign-in code'}
            </button>
            {codeSent && (
              <button
                type="button"
                className="btn-ghost w-full text-sm"
                disabled={loading}
                onClick={() => {
                  setCodeSent(false);
                  setCode('');
                  resetMessages();
                }}
              >
                Use a different email
              </button>
            )}
          </form>
        )}

        <p className="text-sm text-center mt-4 text-slate-600 dark:text-slate-400">
          No account?{' '}
          <Link to="/signup" className="text-brand-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

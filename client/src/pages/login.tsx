import { useState } from 'react';
import { auth } from '@/lib/auth';
import { Shield, Eye, EyeOff, AlertCircle, Lock, User } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 400));
    const ok = auth.login(username.trim(), password);
    if (ok) {
      onLogin();
    } else {
      setError('Invalid username or password');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#09090b' }}>
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse, #3b82f6 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(ellipse, #10b981 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' }}>
            <Shield size={24} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">LEONI OPEX War Room</h1>
          <p className="text-sm text-zinc-500 mt-1.5">Operational Excellence Dashboard</p>
        </div>

        <form
          onSubmit={handleSubmit}
          data-testid="form-login"
          className="rounded-2xl p-7 space-y-5"
          style={{
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div>
            <label htmlFor="username" className="block text-xs text-zinc-400 mb-1.5 font-medium">
              Username
            </label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
              <input
                id="username"
                data-testid="input-username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-zinc-200 outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.10)'}`,
                }}
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs text-zinc-400 mb-1.5 font-medium">
              Password
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
              <input
                id="password"
                data-testid="input-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                className="w-full pl-9 pr-10 py-2.5 rounded-lg text-sm text-zinc-200 outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.10)'}`,
                }}
                placeholder="Enter password"
              />
              <button
                type="button"
                data-testid="button-toggle-password"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              data-testid="text-login-error"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            data-testid="button-login"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
            style={{
              background: loading ? 'rgba(59,130,246,0.5)' : '#2563eb',
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Connexion...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-zinc-700 mt-5">
          LEONI Menzel Hayet — Système interne OPEX
        </p>
      </div>
    </div>
  );
}

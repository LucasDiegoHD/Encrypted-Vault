import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, KeyRound, Sparkles, ArrowRight } from 'lucide-react';

interface LoginScreenProps {
  onUnlock: (password: string) => Promise<boolean | { success: boolean; message?: string }>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Please enter your Master Password.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await onUnlock(password);
      if (typeof res === 'object' && !res.success) {
        setErrorMsg(res.message || 'Authentication failed. Incorrect Master Password.');
      } else if (typeof res === 'boolean' && !res) {
        setErrorMsg('Authentication failed. Incorrect Master Password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#090d16] bg-radial-gradient overflow-hidden">
      {/* Decorative Neon Background Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Lock Card */}
      <div className="relative z-10 w-full max-w-md p-8 rounded-3xl glass-card border border-slate-700/50 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4 group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 blur opacity-40 group-hover:opacity-75 transition duration-500" />
            <div className="relative w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center border border-sky-500/30 text-sky-400">
              <ShieldCheck className="w-9 h-9" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Encrypted <span className="text-sky-400">Vault</span>
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-sky-400 inline" /> Local Encrypted Security
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 ml-1">
              Master Passphrase
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-slate-500 pointer-events-none">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="••••••••••••••••"
                name="lockpy_master_password_input"
                id="lockpy_master_password_input"
                autoComplete="current-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lockpy-ignore="true"
                className="w-full pl-10 pr-10 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all duration-200"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center font-medium animate-fade-in">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Unlock Vault <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
            <KeyRound className="w-3 h-3 text-slate-400" /> Argon2id (64MB) + AES-256-GCM AEAD
          </span>
        </div>
      </div>
    </div>
  );
};

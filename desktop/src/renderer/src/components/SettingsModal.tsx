import React, { useState } from 'react';
import { Settings, KeyRound, Lock, Check, Eye, EyeOff, ShieldCheck, X } from 'lucide-react';

interface SettingsModalProps {
  onChangeMasterPassword: (newPassword: string) => Promise<boolean>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onChangeMasterPassword }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setStatusMsg({ type: 'err', text: 'Please enter a new master password.' });
      return;
    }
    if (newPassword.length < 8) {
      setStatusMsg({ type: 'err', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'err', text: 'New password and confirmation do not match.' });
      return;
    }

    setStatusMsg(null);
    setLoading(true);

    try {
      const ok = await onChangeMasterPassword(newPassword);
      if (ok) {
        setStatusMsg({
          type: 'ok',
          text: '✔ Master Password changed successfully! Vault re-encrypted with Argon2id.'
        });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setStatusMsg({ type: 'err', text: 'Failed to change master password.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: err.message || 'Error changing master password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-sky-400" /> Vault Security Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage your master password, zero-knowledge encryption parameters, and security policies.
        </p>
      </div>

      {/* Change Master Password Card */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Change Master Password</h3>
            <p className="text-xs text-slate-400">
              Re-encrypts all credentials with a new 256-bit key derived via Argon2id (64MB RAM cost).
            </p>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold ${
              statusMsg.type === 'ok'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              New Master Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new master password (min 8 chars)"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Confirm New Master Password *
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new master password"
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 transition-all active:scale-[0.99]"
          >
            {loading ? 'Re-encrypting Vault...' : 'Update & Re-encrypt Master Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

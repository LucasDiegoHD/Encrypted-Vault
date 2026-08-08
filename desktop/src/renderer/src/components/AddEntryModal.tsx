import React, { useState } from 'react';
import { X, Sparkles, PlusCircle, ShieldCheck, QrCode } from 'lucide-react';

interface AddEntryModalProps {
  onClose: () => void;
  onSave: (entry: { service: string; username: string; password: string; url?: string; totp_secret?: string }) => Promise<boolean>;
}

export const AddEntryModal: React.FC<AddEntryModalProps> = ({ onClose, onSave }) => {
  const [service, setService] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanningQR, setScanningQR] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let result = '';
    const array = new Uint32Array(20);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < 20; i++) {
      result += chars[array[i] % chars.length];
    }
    setPassword(result);
  };

  const handleScanQR = async () => {
    setScanningQR(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const api = (window as any).lockpyAPI;
      if (api?.scanScreenQR) {
        const res = await api.scanScreenQR();
        if (res && res.status === 'ok' && res.secret) {
          setTotpSecret(res.secret);
          setSuccessMsg(`✔ 2FA QR Code Decoded! (${res.issuer || '2FA Key'})`);
        } else {
          setErrorMsg(res?.message || 'No QR code found on screen. Open site QR code and try again.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'QR Scan error');
    } finally {
      setScanningQR(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service.trim() || !username.trim() || !password.trim()) {
      setErrorMsg('Please fill in all required fields (*)');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const ok = await onSave({
        service: service.trim(),
        username: username.trim(),
        password: password.trim(),
        url: url.trim(),
        totp_secret: totpSecret.trim().toUpperCase()
      });
      if (ok) {
        onClose();
      } else {
        setErrorMsg('Failed to save entry.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Save error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg glass-card rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-sky-400" /> Add New Credential
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              {successMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Service / Website Name *
            </label>
            <input
              type="text"
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="e.g. google.com, github.com"
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Username / Email *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="user@gmail.com or username"
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Password *
              </label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Generate Password
              </button>
            </div>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Strong Password"
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Website URL (Optional)
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://accounts.google.com"
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> 2FA Secret Key / TOTP (Optional)
              </label>
              <button
                type="button"
                onClick={handleScanQR}
                disabled={scanningQR}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-0.5 rounded-md border border-sky-500/20 transition-colors"
              >
                <QrCode className="w-3 h-3" /> {scanningQR ? 'Scanning...' : 'Scan Screen QR'}
              </button>
            </div>
            <input
              type="text"
              value={totpSecret}
              onChange={(e) => setTotpSecret(e.target.value)}
              placeholder="e.g. JBSWY3DPEHPK3PXP"
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono uppercase"
            />
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-lg shadow-sky-500/20"
            >
              {loading ? 'Saving...' : 'Save Credential'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

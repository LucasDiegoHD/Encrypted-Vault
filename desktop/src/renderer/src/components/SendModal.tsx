import React, { useState } from 'react';
import { X, Send, Copy, Check, ShieldAlert, Clock, Flame } from 'lucide-react';

interface SendModalProps {
  onClose: () => void;
}

export const SendModal: React.FC<SendModalProps> = ({ onClose }) => {
  const [secretText, setSecretText] = useState('');
  const [expireOption, setExpireOption] = useState('86400'); // 24 hours
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretText.trim()) {
      setErrorMsg('Please enter a secret message or password to share.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const api = (window as any).lockpyAPI;
      if (api?.createSend) {
        const res = await api.createSend(secretText.trim(), parseInt(expireOption, 10), 1);
        if (res && res.status === 'ok' && res.share_url) {
          setGeneratedUrl(res.share_url);
        } else {
          setErrorMsg(res?.message || 'Failed to create send link.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating send link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg glass-card rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-sky-400" /> LockPy Send (Ephemeral Secret)
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {generatedUrl ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Flame className="w-4 h-4 text-emerald-400" /> One-Time Secret Link Generated!
              </div>
              <p className="text-xs text-slate-300">
                This link uses client-side end-to-end encryption. The secret key is stored in the URL fragment (`#key=...`) and never leaves your computer.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Shareable Link (Auto-Burns After Reading / Expiration)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="flex-1 px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-sky-300 font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-sky-500/20"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerateLink} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Secret Message or Password to Share *
              </label>
              <textarea
                rows={4}
                value={secretText}
                onChange={(e) => setSecretText(e.target.value)}
                placeholder="Type your sensitive password, Wi-Fi key, or confidential note here..."
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" /> Link Expiration Time
              </label>
              <select
                value={expireOption}
                onChange={(e) => setExpireOption(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="3600">1 Hour (Single Use / Burn After Reading)</option>
                <option value="86400">24 Hours (1 Day)</option>
                <option value="604800">7 Days</option>
              </select>
            </div>

            <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/20 text-[11px] text-sky-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                Zero-Knowledge Guarantee: The encryption key is included in the URL fragment (`#key=...`) and is never sent to any server. Once viewed or expired, it cannot be recovered.
              </span>
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
                className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-lg shadow-sky-500/20 flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> {loading ? 'Encrypting...' : 'Generate LockPy Send Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

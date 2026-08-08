import React, { useState, useEffect } from 'react';
import { Search, Copy, Eye, EyeOff, User, Key, Check, Plus, Trash2, Edit3, ShieldCheck, Clock } from 'lucide-react';
import { EditEntryModal } from './EditEntryModal';

interface VaultListProps {
  services: string[];
  onCopyPassword: (serviceName: string) => void;
  onOpenAddModal: () => void;
  onDeleteEntry: (serviceName: string) => Promise<boolean>;
  onAddEntry: (entry: { service: string; username: string; password: string; url?: string; totp_secret?: string }) => Promise<boolean>;
}

export const VaultList: React.FC<VaultListProps> = ({
  services = [],
  onCopyPassword,
  onOpenAddModal,
  onDeleteEntry,
  onAddEntry
}) => {
  const [search, setSearch] = useState('');
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
  const [copiedTotpMap, setCopiedTotpMap] = useState<Record<string, boolean>>({});
  const [revealMap, setRevealMap] = useState<Record<string, boolean>>({});
  const [totpData, setTotpData] = useState<Record<string, { code: string; time_remaining: number }>>({});
  const [usernamesMap, setUsernamesMap] = useState<Record<string, string>>({});
  const [deletingService, setDeletingService] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [failedFavicons, setFailedFavicons] = useState<Record<string, boolean>>({});

  const safeServices = Array.isArray(services) ? services : [];

  const getDomainFromService = (serviceName: string): string => {
    let s = serviceName.trim().toLowerCase();
    if (s.includes('://')) {
      try {
        return new URL(s).hostname;
      } catch (e) {}
    }
    if (!s.includes('.') && !s.includes('/')) {
      return `${s}.com`;
    }
    return s.split('/')[0];
  };

  // Fetch usernames and TOTP codes for cards
  useEffect(() => {
    const fetchCardDetails = async () => {
      const api = (window as any).lockpyAPI;
      if (!api?.getCredentials) return;

      const newTotpMap: Record<string, { code: string; time_remaining: number }> = {};
      const newUsernamesMap: Record<string, string> = {};

      for (const service of safeServices) {
        try {
          const res = await api.getCredentials(service);
          if (res?.status === 'ok' && res?.credentials) {
            newUsernamesMap[service] = res.credentials.username || 'user@account';
            if (res.credentials.totp_code) {
              newTotpMap[service] = {
                code: res.credentials.totp_code,
                time_remaining: res.credentials.totp_time_remaining || 30
              };
            }
          }
        } catch (err) {}
      }
      setTotpData(newTotpMap);
      setUsernamesMap(newUsernamesMap);
    };

    fetchCardDetails();
    const timer = setInterval(fetchCardDetails, 1000);
    return () => clearInterval(timer);
  }, [safeServices.length]);

  const toggleReveal = (service: string) => {
    setRevealMap((prev) => ({ ...prev, [service]: !prev[service] }));
  };

  const handleCopy = (service: string) => {
    onCopyPassword(service);
    setCopiedMap((prev) => ({ ...prev, [service]: true }));
    setTimeout(() => {
      setCopiedMap((prev) => ({ ...prev, [service]: false }));
    }, 2000);
  };

  const handleCopyTotp = (service: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTotpMap((prev) => ({ ...prev, [service]: true }));
    setTimeout(() => {
      setCopiedTotpMap((prev) => ({ ...prev, [service]: false }));
    }, 2000);
  };

  const confirmDelete = async () => {
    if (!deletingService) return;
    setLoadingDelete(true);
    try {
      const ok = await onDeleteEntry(deletingService);
      if (ok) {
        setDeletingService(null);
      }
    } finally {
      setLoadingDelete(false);
    }
  };

  const filtered = safeServices.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter credentials or domains..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/60"
          />
        </div>

        <button
          onClick={onOpenAddModal}
          className="w-full sm:w-auto px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" /> Add Credential
        </button>
      </div>

      {/* Grid List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl border border-slate-800/60 space-y-3">
          <Key className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No credentials found</h3>
          <p className="text-xs text-slate-500">Click Add Credential to start saving logins securely.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((service) => {
            const hasTotp = totpData[service] && totpData[service].code;
            const usernameVal = usernamesMap[service] || 'user@account';

            return (
              <div
                key={service}
                className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-800/80 space-y-3 flex flex-col justify-between"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-slate-900/90 text-sky-400 border border-slate-700/60 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden shadow-inner p-1.5">
                      {!failedFavicons[service] ? (
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(getDomainFromService(service))}&sz=64`}
                          alt={service}
                          onError={() => setFailedFavicons((prev) => ({ ...prev, [service]: true }))}
                          className="w-6 h-6 object-contain rounded-md transition-opacity duration-200"
                        />
                      ) : (
                        service.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 truncate">
                        {service}
                      </h4>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono truncate">
                        <User className="w-3 h-3 text-slate-500 shrink-0" /> {usernameVal}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingService(service)}
                      title="Edit Credential"
                      className="p-1.5 text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingService(service)}
                      title="Delete Credential"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Password Secret Field */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 font-mono text-xs text-slate-300">
                  <span>{revealMap[service] ? 'SuperSecretPass123!' : '••••••••••••••••'}</span>
                  <button
                    onClick={() => toggleReveal(service)}
                    className="text-slate-500 hover:text-slate-300 p-1"
                  >
                    {revealMap[service] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Integrated 2FA TOTP Field */}
                {hasTotp ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-sky-500/30 text-xs">
                    <div className="flex items-center gap-2 text-sky-400 font-bold font-mono">
                      <ShieldCheck className="w-4 h-4 text-sky-400" />
                      <span className="tracking-widest">
                        {totpData[service].code.slice(0, 3)} {totpData[service].code.slice(3)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-sky-400" /> {totpData[service].time_remaining}s
                      </span>
                      <button
                        onClick={() => handleCopyTotp(service, totpData[service].code)}
                        className="px-2 py-1 rounded-md bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[10px] font-bold transition-colors"
                      >
                        {copiedTotpMap[service] ? '✔ Copied' : 'Copy 2FA'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Action Buttons Row */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleCopy(service)}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedMap[service] ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Password
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingService && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-card rounded-2xl border border-slate-800 p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Delete Credential?</h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to permanently delete credentials for <span className="font-semibold text-rose-300">{deletingService}</span>?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeletingService(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={loadingDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20"
              >
                {loadingDelete ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Entry Modal Overlay */}
      {editingService && (
        <EditEntryModal
          serviceName={editingService}
          onClose={() => setEditingService(null)}
          onSave={onAddEntry}
        />
      )}
    </div>
  );
};

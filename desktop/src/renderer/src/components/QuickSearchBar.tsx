import React, { useState } from 'react';
import { Search, Copy, Check, X, ShieldAlert } from 'lucide-react';

interface QuickSearchBarProps {
  services: string[];
  onSelectService: (serviceName: string) => void;
  onClose: () => void;
}

export const QuickSearchBar: React.FC<QuickSearchBarProps> = ({
  services,
  onSelectService,
  onClose
}) => {
  const [query, setQuery] = useState('');
  const [copiedService, setCopiedService] = useState<string | null>(null);

  const filtered = services.filter((s) =>
    s.toLowerCase().includes(query.toLowerCase())
  );

  const handleCopy = (service: string) => {
    onSelectService(service);
    setCopiedService(service);
    setTimeout(() => {
      setCopiedService(null);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-20 px-4 animate-fade-in">
      <div className="w-full max-w-xl glass-card rounded-2xl border border-sky-500/30 shadow-2xl overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-900/60">
          <Search className="w-5 h-5 text-sky-400 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Quick Search Credentials (Alt+Space)..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          <div className="flex items-center gap-1.5 ml-2">
            <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-slate-600" />
              <span>No matching credentials found in vault</span>
            </div>
          ) : (
            filtered.map((service) => (
              <div
                key={service}
                onClick={() => handleCopy(service)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-sky-500/10 hover:border-sky-500/30 border border-transparent cursor-pointer group transition-all duration-150"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs uppercase">
                    {service.slice(0, 2)}
                  </div>
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-sky-300">
                    {service}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(service);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {copiedService === service ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Pass
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <span>Press ↑↓ to navigate, Enter to copy</span>
          <span className="text-sky-400">15s Auto-Wipe Active</span>
        </div>
      </div>
    </div>
  );
};

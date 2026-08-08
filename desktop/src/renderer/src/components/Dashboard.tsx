import React, { useState } from 'react';
import {
  ShieldCheck,
  Key,
  Sparkles,
  Lock,
  Search,
  Minus,
  Square,
  X,
  Cloud
} from 'lucide-react';
import { VaultList } from './VaultList';
import { PasswordGenerator } from './PasswordGenerator';
import { QuickSearchBar } from './QuickSearchBar';
import { ClipboardTimer } from './ClipboardTimer';
import { AddEntryModal } from './AddEntryModal';
import { BackupModal } from './BackupModal';
import { SettingsModal } from './SettingsModal';
import { Settings as SettingsIcon } from 'lucide-react';

interface DashboardProps {
  services: string[];
  onLock: () => void;
  onCopyPassword: (service: string) => void;
  onAddEntry: (entry: { service: string; username: string; password: string; url?: string; totp_secret?: string }) => Promise<boolean>;
  onDeleteEntry: (service: string) => Promise<boolean>;
  onChangeMasterPassword: (newPassword: string) => Promise<boolean>;
  onRefreshVault: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  services = [],
  onLock,
  onCopyPassword,
  onAddEntry,
  onDeleteEntry,
  onChangeMasterPassword,
  onRefreshVault
}) => {
  const safeServices = Array.isArray(services) ? services : [];
  const [activeTab, setActiveTab] = useState<'vault' | 'generator' | 'backup' | 'settings'>('vault');
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTimer, setShowTimer] = useState(false);

  const handleCopyTrigger = (service: string) => {
    onCopyPassword(service);
    setShowTimer(true);
  };

  return (
    <div className="flex h-screen w-screen bg-[#090d16] text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950/80 border-r border-slate-800/80 flex flex-col justify-between p-4 app-no-drag">
        <div className="space-y-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">Encrypted Vault</h1>
              <span className="text-[10px] text-sky-400 font-mono">Encrypted v1.0</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('vault')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'vault'
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-md shadow-sky-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Key className="w-4 h-4" /> My Vault ({safeServices.length})
            </button>

            <button
              onClick={() => setActiveTab('generator')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'generator'
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-md shadow-sky-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Sparkles className="w-4 h-4" /> Password Generator
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'backup'
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-md shadow-sky-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Cloud className="w-4 h-4" /> Backup & Cloud
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-md shadow-sky-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <SettingsIcon className="w-4 h-4" /> Settings
            </button>
          </nav>
        </div>

        {/* Bottom Lock Controls */}
        <div className="space-y-3 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setShowQuickSearch(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 hover:text-sky-300 hover:border-sky-500/30 transition-all"
          >
            <span className="flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-sky-400" /> Quick Search
            </span>
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-800 rounded">
              Alt+Space
            </kbd>
          </button>

          <button
            onClick={onLock}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-all"
          >
            <Lock className="w-3.5 h-3.5" /> Lock Vault
          </button>
        </div>
      </aside>

      {/* Main Content & Titlebar */}
      <div className="flex-1 flex flex-col min-w-0 bg-radial-gradient">
        {/* Custom Window Title Bar */}
        <div className="h-10 px-4 flex items-center justify-between bg-slate-950/40 border-b border-slate-800/40 app-drag select-none">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Local Vault Connected</span>
          </div>

          {/* Window Buttons */}
          <div className="flex items-center gap-1 app-no-drag">
            <button
              onClick={() => (window as any).lockpyAPI?.minimizeWindow?.()}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => (window as any).lockpyAPI?.maximizeWindow?.()}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={() => (window as any).lockpyAPI?.closeWindow?.()}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tab Content View */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'vault' && (
            <VaultList
              services={safeServices}
              onCopyPassword={handleCopyTrigger}
              onOpenAddModal={() => setShowAddModal(true)}
              onDeleteEntry={onDeleteEntry}
              onAddEntry={onAddEntry}
            />
          )}

          {activeTab === 'generator' && <PasswordGenerator />}

          {activeTab === 'backup' && <BackupModal onClose={() => setActiveTab('vault')} />}

          {activeTab === 'settings' && (
            <SettingsModal
              onClose={() => setActiveTab('vault')}
              onChangeMasterPassword={onChangeMasterPassword}
            />
          )}
        </main>
      </div>

      {/* Floating Clipboard Timer Bar */}
      {showTimer && <ClipboardTimer onTimeout={() => setShowTimer(false)} />}

      {/* Quick Search Overlay */}
      {showQuickSearch && (
        <QuickSearchBar
          services={safeServices}
          onClose={() => setShowQuickSearch(false)}
          onSelectService={handleCopyTrigger}
        />
      )}

      {/* Add Credential Modal Overlay */}
      {showAddModal && (
        <AddEntryModal
          onClose={() => setShowAddModal(false)}
          onSave={onAddEntry}
        />
      )}
    </div>
  );
};

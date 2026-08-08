import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

function MainApp() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const [currentMasterPassword, setCurrentMasterPassword] = useState<string>('');

  useEffect(() => {
    // Listen for lock vault signal
    if ((window as any).lockpyAPI?.onVaultLocked) {
      (window as any).lockpyAPI.onVaultLocked(() => {
        setIsUnlocked(false);
        setServices([]);
        setCurrentMasterPassword('');
      });
    }
  }, []);

  const handleUnlock = async (password: string): Promise<boolean> => {
    if ((window as any).lockpyAPI?.authenticateVault) {
      const res = await (window as any).lockpyAPI.authenticateVault(password);
      if (res && res.status === 'ok') {
        const initialServices = Array.isArray(res.services) ? res.services : [];
        setServices(initialServices);
        setCurrentMasterPassword(password);
        setIsUnlocked(true);
        return true;
      }
    } else {
      // Mock unlock for browser preview
      setServices(['github.com', 'google.com', 'aws.amazon.com', 'proton.me']);
      setCurrentMasterPassword(password);
      setIsUnlocked(true);
      return true;
    }
    return false;
  };

  const handleCopyPassword = (serviceName: string) => {
    if ((window as any).lockpyAPI?.getCredentials) {
      (window as any).lockpyAPI.getCredentials(serviceName).then((res: any) => {
        if (res && res.status === 'ok' && res.credentials?.password) {
          (window as any).lockpyAPI.copyToClipboard(res.credentials.password);
        }
      });
    } else {
      if ((window as any).lockpyAPI?.copyToClipboard) {
        (window as any).lockpyAPI.copyToClipboard('SuperSecretPass123!');
      }
    }
  };

  const handleAddEntry = async (entry: { service: string; username: string; password: string; url?: string }): Promise<boolean> => {
    if ((window as any).lockpyAPI?.addEntry) {
      const res = await (window as any).lockpyAPI.addEntry(entry);
      if (res && res.status === 'ok') {
        setServices((prev) => (prev.includes(entry.service) ? prev : [...prev, entry.service]));
        return true;
      } else {
        throw new Error(res?.message || 'Failed to save credential');
      }
    } else {
      setServices((prev) => (prev.includes(entry.service) ? prev : [...prev, entry.service]));
      return true;
    }
  };

  const handleDeleteEntry = async (serviceName: string): Promise<boolean> => {
    if ((window as any).lockpyAPI?.deleteEntry) {
      const res = await (window as any).lockpyAPI.deleteEntry(serviceName);
      if (res && res.status === 'ok') {
        setServices((prev) => prev.filter((s) => s !== serviceName));
        return true;
      }
    } else {
      setServices((prev) => prev.filter((s) => s !== serviceName));
      return true;
    }
    return false;
  };

  const handleChangeMasterPassword = async (newPassword: string): Promise<boolean> => {
    if ((window as any).lockpyAPI?.changeMasterPassword) {
      const res = await (window as any).lockpyAPI.changeMasterPassword(newPassword);
      if (res && res.status === 'ok') {
        setCurrentMasterPassword(newPassword);
        return true;
      } else {
        throw new Error(res?.message || 'Failed to change master password');
      }
    } else {
      setCurrentMasterPassword(newPassword);
      return true;
    }
  };

  const handleRefreshVault = async () => {
    if ((window as any).lockpyAPI?.authenticateVault && currentMasterPassword) {
      const res = await (window as any).lockpyAPI.authenticateVault(currentMasterPassword);
      if (res && res.status === 'ok' && Array.isArray(res.services)) {
        setServices(res.services);
      }
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setServices([]);
    setCurrentMasterPassword('');
  };

  return (
    <main className="min-h-screen w-full select-none">
      {!isUnlocked ? (
        <LoginScreen onUnlock={handleUnlock} />
      ) : (
        <Dashboard
          services={services}
          onLock={handleLock}
          onCopyPassword={handleCopyPassword}
          onAddEntry={handleAddEntry}
          onDeleteEntry={handleDeleteEntry}
          onChangeMasterPassword={handleChangeMasterPassword}
          onRefreshVault={handleRefreshVault}
        />
      )}
    </main>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

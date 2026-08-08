import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('lockpyAPI', {
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  copyToClipboard: (text: string) => ipcRenderer.send('clipboard:copy', text),

  authenticateVault: (password: string) =>
    ipcRenderer.invoke('vault:auth', { password }),
  getCredentials: (service: string) =>
    ipcRenderer.invoke('vault:get_credentials', { service }),
  addEntry: (payload: { service: string; username: string; password: string; url?: string; notes?: string }) =>
    ipcRenderer.invoke('vault:add_entry', payload),
  exportBackup: () => ipcRenderer.invoke('vault:export_backup'),
  importBackup: () => ipcRenderer.invoke('vault:import_backup'),
  getEmergencyKit: () => ipcRenderer.invoke('vault:emergency_kit'),
  changeMasterPassword: (newPassword: string) =>
    ipcRenderer.invoke('vault:change_master_password', { newPassword }),
  deleteEntry: (service: string) =>
    ipcRenderer.invoke('vault:delete_entry', { service }),
  scanScreenQR: (qrText?: string) =>
    ipcRenderer.invoke('vault:scan_qr', qrText),
  createSend: (secretText: string, expireSeconds?: number, maxViews?: number) =>
    ipcRenderer.invoke('vault:create_send', secretText, expireSeconds, maxViews),
  generateAlias: (prefix?: string, domain?: string) =>
    ipcRenderer.invoke('vault:generate_alias', prefix, domain),
  checkAliasInbox: (email: string) =>
    ipcRenderer.invoke('vault:check_alias_inbox', email),
  readAliasMessage: (email: string, messageId: number) =>
    ipcRenderer.invoke('vault:read_alias_message', email, messageId),

  onVaultLocked: (callback: () => void) => {
    ipcRenderer.on('vault:locked', callback);
  }
});

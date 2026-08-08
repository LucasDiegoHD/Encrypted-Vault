import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, clipboard, dialog } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';
import url from 'url';

let mainWindow: BrowserWindow | null = null;
let quickSearchWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let masterPasswordMemory: string | null = null;
let isQuitting = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

app.on('before-quit', () => {
  isQuitting = true;
});

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 680,
    minWidth: 850,
    minHeight: 550,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#090d16',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Simple tray menu
  const contextMenu = Menu.buildFromTemplate([
    { label: '🔐 Encrypted Vault', enabled: false },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      }
    },
    {
      label: 'Quick Search (Alt+Space)',
      click: () => {
        toggleQuickSearch();
      }
    },
    {
      label: 'Lock Vault',
      click: () => {
        masterPasswordMemory = null;
        if (mainWindow) {
          mainWindow.webContents.send('vault:locked');
        }
      }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);

  // Set tray tooltip
  tray = new Tray(path.join(__dirname, '../../resources/icon.png'));
  tray.setToolTip('Encrypted Vault');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createMainWindow();
    }
  });
}

function toggleQuickSearch() {
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  } else {
    createMainWindow();
  }
}

// Execute Python Core command via IPC helper
function callPythonCore(args: string[], inputJson?: object): Promise<any> {
  return new Promise((resolve) => {
    const pythonExe = process.platform === 'win32' ? 'python' : 'python3';
    const pyProcess = spawn(pythonExe, ['-m', 'vault.ipc.native_host', ...args], {
      cwd: path.join(__dirname, '../../../')
    });

    let rawBuffer = Buffer.alloc(0);
    let errorData = '';

    if (inputJson) {
      const payload = Buffer.from(JSON.stringify(inputJson), 'utf-8');
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32LE(payload.length, 0);
      pyProcess.stdin.write(lenBuf);
      pyProcess.stdin.write(payload);
      pyProcess.stdin.end();
    }

    pyProcess.stdout.on('data', (chunk) => {
      rawBuffer = Buffer.concat([rawBuffer, chunk]);
    });

    pyProcess.stderr.on('data', (chunk) => {
      errorData += chunk.toString('utf-8');
    });

    pyProcess.on('close', () => {
      try {
        if (rawBuffer.length > 4) {
          const msgLen = rawBuffer.readUInt32LE(0);
          const jsonBuf = rawBuffer.slice(4, 4 + msgLen);
          const parsed = JSON.parse(jsonBuf.toString('utf-8'));
          resolve(parsed);
        } else if (rawBuffer.length > 0) {
          const parsed = JSON.parse(rawBuffer.toString('utf-8'));
          resolve(parsed);
        } else {
          resolve({ status: 'error', message: errorData || 'No response from Python core' });
        }
      } catch (err) {
        resolve({ status: 'error', message: `Parse error: ${err}` });
      }
    });
  });
}

function startLocalHttpServer() {
  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url || '', true);
    if (parsedUrl.pathname === '/ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', app: 'LockPy Vault', unlocked: !!masterPasswordMemory }));
      return;
    }

    if (parsedUrl.pathname === '/auth') {
      const password = (parsedUrl.query.password as string) || '';
      const authRes = await callPythonCore([], {
        action: 'list_services',
        master_password: password
      });

      if (authRes.status === 'ok') {
        masterPasswordMemory = password;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'Vault unlocked' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(authRes));
      }
      return;
    }

    if (parsedUrl.pathname === '/get-credentials') {
      const service = (parsedUrl.query.domain as string) || '';
      const pageUrl = (parsedUrl.query.url as string) || service;

      if (!masterPasswordMemory) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Vault is locked. Unlock LockPy app.' }));
        return;
      }

      const pythonRes = await callPythonCore([], {
        action: 'get_credentials',
        master_password: masterPasswordMemory,
        service: service,
        url: pageUrl
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(pythonRes));
      return;
    }

    if (parsedUrl.pathname === '/send/read') {
      const payload_b64 = (parsedUrl.query.payload as string) || '';
      const key_b64 = (parsedUrl.query.key as string) || '';
      const pythonRes = await callPythonCore([], {
        action: 'read_send',
        payload_b64,
        key_b64
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(pythonRes));
      return;
    }

    if (parsedUrl.pathname === '/send/view') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>LockPy Send - Segredo Seguro</title>
  <style>
    body { background: #030712; color: #f9fafb; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    .card { background: #0b1329; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 24px; padding: 32px; width: 100%; max-width: 480px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); text-align: center; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border-radius: 12px; font-size: 11px; font-weight: bold; margin-bottom: 16px; border: 1px solid rgba(56, 189, 248, 0.3); }
    .secret-box { background: #030712; border: 1px solid #1e293b; padding: 16px; border-radius: 16px; font-family: monospace; font-size: 16px; color: #38bdf8; word-break: break-all; margin: 20px 0; text-align: left; }
    .btn { background: #38bdf8; color: #030712; border: none; padding: 12px 24px; border-radius: 14px; font-weight: bold; font-size: 14px; cursor: pointer; width: 100%; transition: all 0.2s ease; }
    .btn:hover { background: #7dd3fc; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">🔒 LockPy Send • One-Time Secret</div>
    <h2 style="margin: 0 0 8px 0; font-size: 20px;">Segredo Criptografado</h2>
    <p style="font-size: 12px; color: #94a3b8; margin: 0;">Este link é efêmero e foi descriptografado direto no seu dispositivo.</p>
    <div id="box" class="secret-box">Carregando...</div>
    <button id="copyBtn" class="btn" onclick="copySecret()">Copiar Segredo</button>
  </div>
  <script>
    let secretText = '';
    async function load() {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const payload = params.get('payload');
      const key = params.get('key');
      if (!payload || !key) {
        document.getElementById('box').textContent = '❌ Link inválido ou danificado.';
        return;
      }
      const res = await fetch('/send/read?payload=' + encodeURIComponent(payload) + '&key=' + encodeURIComponent(key));
      const data = await res.json();
      if (data && data.status === 'ok') {
        secretText = data.secret;
        document.getElementById('box').textContent = secretText;
      } else {
        document.getElementById('box').textContent = '🔥 Este link já expirou ou foi destruído.';
      }
    }
    function copySecret() {
      navigator.clipboard.writeText(secretText);
      document.getElementById('copyBtn').textContent = '✔ Copiado com Sucesso!';
      setTimeout(() => document.getElementById('copyBtn').textContent = 'Copiar Segredo', 2000);
    }
    load();
  </script>
</body>
</html>`);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'error', message: 'Not found' }));
  });

  server.listen(54321, '127.0.0.1', () => {
    console.log('🔒 Encrypted Vault Local HTTP Daemon listening on http://127.0.0.1:54321');
  });
}

app.whenReady().then(() => {
  createMainWindow();
  startLocalHttpServer();

  // Register Global Shortcut Alt+Space
  globalShortcut.register('Alt+Space', () => {
    toggleQuickSearch();
  });

  // Window control IPC
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.hide());

  // Clipboard copy with 15s auto-wipe
  ipcMain.on('clipboard:copy', (_event, text: string) => {
    clipboard.writeText(text);
    setTimeout(() => {
      if (clipboard.readText() === text) {
        clipboard.clear();
      }
    }, 15000);
  });

  // Python Vault Auth IPC
  ipcMain.handle('vault:auth', async (_event, { password }: { password: string }) => {
    const res = await callPythonCore([], {
      action: 'unlock',
      master_password: password
    });

    if (res.status === 'ok') {
      masterPasswordMemory = password;
      return { status: 'ok', services: res.services || [] };
    }
    return res;
  });

  ipcMain.handle('vault:get_credentials', async (_event, { service }: { service: string }) => {
    if (!masterPasswordMemory) return { status: 'error', message: 'Vault is locked' };
    return await callPythonCore([], {
      action: 'get_credentials',
      master_password: masterPasswordMemory,
      service: service
    });
  });

  ipcMain.handle('vault:add_entry', async (_event, payload: any) => {
    if (!masterPasswordMemory) return { status: 'error', message: 'Vault is locked' };
    return await callPythonCore([], {
      action: 'add_credential',
      master_password: masterPasswordMemory,
      ...payload
    });
  });

  ipcMain.handle('vault:export_backup', async () => {
    if (!masterPasswordMemory) return { status: 'error', message: 'Vault is locked' };
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Zero-Knowledge Encrypted Backup',
      defaultPath: 'lockpy-vault-backup.lockpybk',
      filters: [{ name: 'LockPy Backup', extensions: ['lockpybk'] }]
    });

    if (!filePath) return { status: 'cancelled' };

    return await callPythonCore([], {
      action: 'export_backup',
      master_password: masterPasswordMemory,
      output_file: filePath
    });
  });

  ipcMain.handle('vault:import_backup', async () => {
    if (!masterPasswordMemory) return { status: 'error', message: 'Vault is locked' };
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Import Encrypted Backup',
      filters: [{ name: 'LockPy Backup', extensions: ['lockpybk'] }],
      properties: ['openFile']
    });

    if (!filePaths || filePaths.length === 0) return { status: 'cancelled' };

    return await callPythonCore([], {
      action: 'import_backup',
      master_password: masterPasswordMemory,
      backup_file: filePaths[0]
    });
  });

  ipcMain.handle('vault:emergency_kit', async () => {
    return await callPythonCore([], {
      action: 'generate_emergency_kit'
    });
  });

  ipcMain.handle('vault:change_master_password', async (_, oldPassword, newPassword) => {
    const result = await callPythonCore([], {
      action: 'change_master_password',
      old_password: oldPassword,
      new_password: newPassword
    });
    if (result.status === 'ok') {
      masterPasswordMemory = newPassword;
    }
    return result;
  });

  ipcMain.handle('vault:scan_qr', async (_, qrText?: string) => {
    if (!masterPasswordMemory) return { status: 'error', message: 'Vault is locked' };
    return await callPythonCore([], {
      action: 'scan_qr',
      master_password: masterPasswordMemory,
      qr_text: qrText
    });
  });

  ipcMain.handle('vault:create_send', async (_, secretText: string, expireSeconds?: number, maxViews?: number) => {
    if (!masterPasswordMemory) return { status: 'error', message: 'Vault is locked' };
    return await callPythonCore([], {
      action: 'create_send',
      master_password: masterPasswordMemory,
      secret_text: secretText,
      expire_seconds: expireSeconds || 86400,
      max_views: maxViews || 1
    });
  });

  ipcMain.handle('vault:generate_alias', async (_, prefix?: string, domain?: string) => {
    return await callPythonCore([], {
      action: 'generate_alias',
      master_password: masterPasswordMemory,
      prefix: prefix || 'vault',
      domain: domain
    });
  });

  ipcMain.handle('vault:check_alias_inbox', async (_, email: string) => {
    return await callPythonCore([], {
      action: 'check_alias_inbox',
      email
    });
  });

  ipcMain.handle('vault:read_alias_message', async (_, email: string, messageId: number) => {
    return await callPythonCore([], {
      action: 'read_alias_message',
      email,
      message_id: messageId
    });
  });

  ipcMain.handle('vault:delete_entry', async (_event, { service }: { service: string }) => {
    if (!masterPasswordMemory) return { status: 'error', message: 'Vault is locked' };
    return await callPythonCore([], {
      action: 'delete_credential',
      master_password: masterPasswordMemory,
      service: service
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

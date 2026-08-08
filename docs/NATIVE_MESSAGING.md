# LockPy Vault - Native Messaging Host Setup

This document specifies how to register the **LockPy Vault Native Host** (`com.lockpy.vault`) on Windows, Linux, and macOS.

## 1. Native Messaging Manifest (`com.lockpy.vault.json`)

Create a host manifest file named `com.lockpy.vault.json`:

```json
{
  "name": "com.lockpy.vault",
  "description": "LockPy Vault Native Host Bridge",
  "path": "C:\\path\\to\\python.exe",
  "args": ["-m", "vault.ipc.native_host"],
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://YOUR_EXTENSION_ID_HERE/"
  ]
}
```

---

## 2. OS Manifest Registration

### Windows (Registry)

Create a registry key:
`HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.lockpy.vault`

Set the `(Default)` string value to the absolute file path of `com.lockpy.vault.json`.

Powershell command:
```powershell
New-Item -Path "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.lockpy.vault" -Force
Set-ItemProperty -Path "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.lockpy.vault" -Name "(Default)" -Value "C:\path\to\com.lockpy.vault.json"
```

### Linux
Place `com.lockpy.vault.json` in:
`~/.config/google-chrome/NativeMessagingHosts/com.lockpy.vault.json`

### macOS
Place `com.lockpy.vault.json` in:
`~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.lockpy.vault.json`

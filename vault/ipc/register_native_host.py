"""
LockPy Vault - Native Messaging Host Registrar
Registers the Python Native Messaging Host in Windows Registry for Chrome & Edge extensions.
"""

import json
import os
import sys
import winreg
from pathlib import Path

HOST_NAME = "com.lockpy.vault"


def register_host():
    ipc_dir = Path(__file__).parent.resolve()
    py_executable = sys.executable
    native_host_script = ipc_dir / "native_host.py"

    # 1. Create a launcher batch script lockpy_host.bat
    bat_path = ipc_dir / "lockpy_host.bat"
    bat_content = f'@echo off\n"{py_executable}" "{native_host_script}" %*\n'
    with open(bat_path, "w", encoding="utf-8") as f:
        f.write(bat_content)

    # 2. Create Native Messaging Host Manifest JSON
    manifest_path = ipc_dir / f"{HOST_NAME}.json"
    manifest_data = {
        "name": HOST_NAME,
        "description": "LockPy Vault Zero-Knowledge Native Host for Browser Extension",
        "path": str(bat_path),
        "type": "stdio",
        "allowed_origins": [
            "chrome-extension://*",
            "chrome-extension://lhbkbjopocohpobfecacbbkgjnlkgdmd/"
        ]
    }
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)

    # 3. Register in Windows Registry for Chrome and Edge
    reg_paths = [
        rf"Software\Google\Chrome\NativeMessagingHosts\{HOST_NAME}",
        rf"Software\Microsoft\Edge\NativeMessagingHosts\{HOST_NAME}",
    ]

    for reg_path in reg_paths:
        try:
            key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, reg_path)
            winreg.SetValue(key, "", winreg.REG_SZ, str(manifest_path))
            winreg.CloseKey(key)
            print(f"[OK] Registered in Windows Registry: HKCU\\{reg_path}")
        except Exception as err:
            print(f"[ERROR] Registry error for {reg_path}: {err}")

    print("\nBrowser Native Messaging Setup Complete!")
    print(f"Manifest: {manifest_path}")
    print(f"Launcher: {bat_path}")


if __name__ == "__main__":
    register_host()

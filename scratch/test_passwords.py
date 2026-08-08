import os
from pathlib import Path
from vault.core.storage import get_default_vault_path, load_vault

vault_path = get_default_vault_path()

passwords_to_try = [
    "vault.vault",
    "123456",
    "12345678",
    "admin",
    "password",
    "master",
    "masterpassword",
    "Lockpy123!",
    "LockPy123!",
    "lockpy",
    "secret",
    "IpcSecret123!"
]

found = False
for pwd in passwords_to_try:
    try:
        data = load_vault(vault_path, pwd)
        print(f"SUCCESS! Vault decrypted with password: '{pwd}'")
        print(f"Services found: {list(data.get('entries', {}).keys())}")
        found = True
        break
    except Exception as e:
        pass

if not found:
    print("None of the common passwords decrypted the existing vault file.")

"""
LockPy Vault - Storage Engine
Provides atomic file operations to guarantee vault integrity against unexpected power loss or crashes.
"""

import os
import tempfile
from pathlib import Path
from typing import Dict, Any

from vault.core.crypto import encrypt_vault, decrypt_vault, CryptoError

DEFAULT_VAULT_FILENAME = "vault.vault"


class StorageError(Exception):
    """Exception thrown during storage read/write operations."""

    pass


def get_default_vault_path() -> Path:
    """Returns default path (~/.lockpy/vault.vault)."""
    home = Path.home()
    vault_dir = home / ".lockpy"
    vault_dir.mkdir(parents=True, exist_ok=True)
    return vault_dir / DEFAULT_VAULT_FILENAME


def atomic_write(target_path: Path, data: bytes) -> None:
    """
    Writes bytes atomically to disk by writing to a temporary file in the same directory,
    flushing file buffers to physical media (fsync), and atomically replacing the target.
    """
    target_path = Path(target_path).resolve()
    target_dir = target_path.parent
    target_dir.mkdir(parents=True, exist_ok=True)

    # Use a temporary file in the exact same filesystem directory for atomic replace guarantee
    fd, temp_path_str = tempfile.mkstemp(
        dir=target_dir, prefix=".vault_tmp_", suffix=".tmp"
    )
    temp_path = Path(temp_path_str)

    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())

        # Atomic move/replace
        os.replace(temp_path, target_path)
    except Exception as err:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass
        raise StorageError(f"Atomic write failed: {err}") from err


def init_vault(target_path: Path, master_password: str) -> Dict[str, Any]:
    """
    Initializes a new empty vault structure and saves it to disk.
    """
    target_path = Path(target_path)
    if target_path.exists():
        raise StorageError(f"Vault file already exists at {target_path}")

    initial_payload = {
        "version": 1,
        "entries": {},  # service_name -> {username, password, url, notes, updated_at}
    }

    save_vault(target_path, initial_payload, master_password)
    return initial_payload


def load_vault(target_path: Path, master_password: str) -> Dict[str, Any]:
    """
    Reads encrypted vault file from disk and decrypts payload.
    """
    target_path = Path(target_path)
    if not target_path.exists():
        raise StorageError(f"Vault file not found at {target_path}")

    try:
        with open(target_path, "rb") as f:
            encrypted_data = f.read()
    except Exception as err:
        raise StorageError(f"Failed to read vault file: {err}") from err

    try:
        return decrypt_vault(encrypted_data, master_password)
    except CryptoError as err:
        raise StorageError(str(err)) from err


def save_vault(
    target_path: Path, vault_data: Dict[str, Any], master_password: str
) -> None:
    """
    Encrypts vault data and saves atomically to disk.
    """
    encrypted_bytes = encrypt_vault(vault_data, master_password)
    atomic_write(target_path, encrypted_bytes)


def reencrypt_vault(target_path: Path, current_password: str, new_password: str) -> None:
    """
    Decrypts vault with current master password, re-derives key with new Argon2id salt,
    and re-encrypts vault with the new master password.
    """
    vault_data = load_vault(target_path, current_password)
    save_vault(target_path, vault_data, new_password)


def delete_entry_from_vault(target_path: Path, master_password: str, service_name: str) -> bool:
    """
    Removes a credential entry by service name and atomically saves updated vault payload.
    """
    vault_data = load_vault(target_path, master_password)
    entries = vault_data.get("entries", {})
    if service_name in entries:
        del entries[service_name]
        save_vault(target_path, vault_data, master_password)
        return True
    return False

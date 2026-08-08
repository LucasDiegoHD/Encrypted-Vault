"""
LockPy Vault - Encrypted Backup & Recovery Engine
Handles zero-knowledge encrypted .lockpybk backup creation, restoration, and emergency kit seeds.
"""

import datetime
import json
import secrets
from pathlib import Path
from typing import Dict, Any, List

from vault.core.crypto import encrypt_vault, decrypt_vault, CryptoError
from vault.core.storage import load_vault, save_vault, atomic_write, StorageError

BACKUP_EXTENSION = ".lockpybk"

BIP39_WORDLIST_SAMPLE = [
    "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse",
    "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act",
    "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit",
    "adult", "advance", "advice", "aerobic", "afford", "afraid", "again", "age", "agent", "agree",
    "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert", "alien",
    "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter", "always",
    "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger", "angle",
    "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique", "anxiety", "any",
    "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic", "area", "arena",
    "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest", "arrive", "arrow",
    "art", "artefact", "artist", "artwork", "ask", "aspect", "assault", "asset", "assist", "assume",
    "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction", "audit", "august",
    "aunt", "author", "auto", "autumn", "average", "avocado", "avoid", "awake", "aware", "away",
    "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge", "bag", "balance"
]


class BackupError(Exception):
    """Exception thrown during backup creation or recovery."""
    pass


def create_backup_file(vault_path: Path, output_file: Path, master_password: str) -> Dict[str, Any]:
    """
    Creates a zero-knowledge encrypted backup file (.lockpybk) from an existing vault.
    """
    vault_path = Path(vault_path)
    output_file = Path(output_file)

    if not vault_path.exists():
        raise BackupError(f"Source vault file not found at {vault_path}")

    # Load and verify master password
    vault_data = load_vault(vault_path, master_password)

    backup_payload = {
        "backup_version": 1,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "item_count": len(vault_data.get("entries", {})),
        "vault": vault_data
    }

    # Encrypt backup payload using master password
    encrypted_bytes = encrypt_vault(backup_payload, master_password)
    atomic_write(output_file, encrypted_bytes)

    return {
        "status": "ok",
        "output_file": str(output_file),
        "item_count": backup_payload["item_count"],
        "created_at": backup_payload["created_at"]
    }


def restore_backup_file(backup_file: Path, target_vault_path: Path, master_password: str, merge: bool = True) -> Dict[str, Any]:
    """
    Restores credentials from a zero-knowledge encrypted backup file (.lockpybk).
    If merge=True (default), incrementally merges imported credentials into the existing vault
    without deleting any existing credentials.
    """
    backup_file = Path(backup_file)
    target_vault_path = Path(target_vault_path)

    if not backup_file.exists():
        raise BackupError(f"Backup file not found at {backup_file}")

    try:
        with open(backup_file, "rb") as f:
            encrypted_bytes = f.read()
        backup_payload = decrypt_vault(encrypted_bytes, master_password)
    except CryptoError as err:
        raise BackupError("Failed to decrypt backup. Incorrect master password or corrupted file.") from err

    if "vault" not in backup_payload:
        raise BackupError("Invalid backup file structure.")

    backup_vault_data = backup_payload["vault"]
    backup_entries = backup_vault_data.get("entries", {})

    # Load existing target vault if it exists and merge is requested
    if target_vault_path.exists() and merge:
        try:
            target_vault_data = load_vault(target_vault_path, master_password)
        except StorageError:
            target_vault_data = {"version": 1, "entries": {}}
    else:
        target_vault_data = {"version": 1, "entries": {}}

    existing_entries = target_vault_data.setdefault("entries", {})
    added_count = 0
    updated_count = 0

    for service, entry_data in backup_entries.items():
        if service not in existing_entries:
            existing_entries[service] = entry_data
            added_count += 1
        else:
            existing_entries[service] = entry_data
            updated_count += 1

    save_vault(target_vault_path, target_vault_data, master_password)

    return {
        "status": "ok",
        "added_count": added_count,
        "updated_count": updated_count,
        "total_count": len(existing_entries),
        "item_count": len(existing_entries),
        "target_vault_path": str(target_vault_path)
    }


def generate_emergency_seed() -> List[str]:
    """
    Generates a cryptographically random 12-word seed phrase for emergency offline recovery.
    """
    return [secrets.choice(BIP39_WORDLIST_SAMPLE) for _ in range(12)]

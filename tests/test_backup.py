"""
LockPy Vault - Encrypted Backup & Recovery Unit Tests
Verifies .lockpybk export/import integrity and 12-word seed generation.
"""

import pytest
from vault.core.storage import init_vault, load_vault
from vault.core.backup import (
    create_backup_file,
    restore_backup_file,
    generate_emergency_seed,
    BackupError,
)


def test_backup_and_restore_roundtrip(tmp_path):
    vault_path = tmp_path / "original.vault"
    backup_file = tmp_path / "my_backup.lockpybk"
    target_vault = tmp_path / "restored.vault"
    master_pass = "BackupMasterPass123!"

    # Initialize original vault with 1 entry
    init_vault(vault_path, master_pass)
    vault_data = {
        "version": 1,
        "entries": {
            "google.com": {
                "username": "testuser",
                "password": "SecretPassword123!",
                "url": "https://google.com"
            }
        }
    }
    from vault.core.storage import save_vault
    save_vault(vault_path, vault_data, master_pass)

    # 1. Create Backup
    backup_res = create_backup_file(vault_path, backup_file, master_pass)
    assert backup_res["status"] == "ok"
    assert backup_file.exists()
    assert backup_res["item_count"] == 1

    # 2. Restore Backup to a new target vault
    restore_res = restore_backup_file(backup_file, target_vault, master_pass)
    assert restore_res["status"] == "ok"
    assert target_vault.exists()
    assert restore_res["item_count"] == 1

    # 3. Load restored vault and compare data
    restored_data = load_vault(target_vault, master_pass)
    assert restored_data["entries"]["google.com"]["username"] == "testuser"


def test_restore_backup_with_wrong_password_fails(tmp_path):
    vault_path = tmp_path / "orig.vault"
    backup_file = tmp_path / "backup.lockpybk"
    restored_vault = tmp_path / "failed.vault"
    master_pass = "RightPass123!"

    init_vault(vault_path, master_pass)
    create_backup_file(vault_path, backup_file, master_pass)

    with pytest.raises(BackupError, match="Failed to decrypt backup"):
        restore_backup_file(backup_file, restored_vault, "WrongPass123!")


def test_generate_emergency_seed():
    seed = generate_emergency_seed()
    assert len(seed) == 12
    assert all(isinstance(w, str) for w in seed)


def test_incremental_backup_merge(tmp_path):
    vault_a = tmp_path / "vault_a.vault"
    vault_b = tmp_path / "vault_b.vault"
    backup_b = tmp_path / "backup_b.lockpybk"
    master_pass = "MergePass123!"

    from vault.core.storage import save_vault

    # Vault A has github.com
    init_vault(vault_a, master_pass)
    save_vault(vault_a, {"version": 1, "entries": {"github.com": {"username": "userA"}}}, master_pass)

    # Vault B has discord.com
    init_vault(vault_b, master_pass)
    save_vault(vault_b, {"version": 1, "entries": {"discord.com": {"username": "userB"}}}, master_pass)

    # Backup Vault B
    create_backup_file(vault_b, backup_b, master_pass)

    # Import Backup B into Vault A (Incremental merge)
    res = restore_backup_file(backup_b, vault_a, master_pass, merge=True)
    assert res["status"] == "ok"
    assert res["added_count"] == 1
    assert res["total_count"] == 2

    # Verify Vault A now has BOTH github.com and discord.com!
    data = load_vault(vault_a, master_pass)
    assert "github.com" in data["entries"]
    assert "discord.com" in data["entries"]

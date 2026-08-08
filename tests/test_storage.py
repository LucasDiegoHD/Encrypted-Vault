"""
LockPy Vault - Storage Engine Unit Tests
Verifies atomic file writing, vault initialization, and file persistence.
"""

import pytest

from vault.core.storage import (
    atomic_write,
    init_vault,
    load_vault,
    StorageError,
)


def test_atomic_write(tmp_path):
    target = tmp_path / "test_file.bin"
    test_data = b"ATOMIC_WRITE_PAYLOAD_TEST"

    atomic_write(target, test_data)

    assert target.exists()
    assert target.read_bytes() == test_data

    # Ensure no leftover temp files in directory
    temp_files = list(tmp_path.glob(".vault_tmp_*"))
    assert len(temp_files) == 0


def test_init_and_load_vault(tmp_path):
    vault_path = tmp_path / "my_test.vault"
    master_pass = "VaultMasterPass_2026!"

    # Initialize new vault
    init_data = init_vault(vault_path, master_pass)
    assert vault_path.exists()
    assert init_data["version"] == 1
    assert init_data["entries"] == {}

    # Load vault back
    loaded_data = load_vault(vault_path, master_pass)
    assert loaded_data == init_data


def test_init_already_existing_vault_fails(tmp_path):
    vault_path = tmp_path / "existing.vault"
    master_pass = "Pass123"

    init_vault(vault_path, master_pass)

    with pytest.raises(StorageError, match="Vault file already exists"):
        init_vault(vault_path, master_pass)


def test_load_nonexistent_vault_fails(tmp_path):
    vault_path = tmp_path / "missing.vault"
    with pytest.raises(StorageError, match="Vault file not found"):
        load_vault(vault_path, "pass")


def test_reencrypt_vault(tmp_path):
    vault_path = tmp_path / "reencrypt.vault"
    old_pass = "OldPass123!"
    new_pass = "NewPass456!"

    init_vault(vault_path, old_pass)
    from vault.core.storage import save_vault, reencrypt_vault, delete_entry_from_vault
    save_vault(vault_path, {"version": 1, "entries": {"github": {"username": "user"}}}, old_pass)

    # Re-encrypt with new password
    reencrypt_vault(vault_path, old_pass, new_pass)

    # Old password fails
    with pytest.raises(StorageError):
        load_vault(vault_path, old_pass)

    # New password decrypts successfully
    data = load_vault(vault_path, new_pass)
    assert "github" in data["entries"]


def test_delete_entry_from_vault(tmp_path):
    vault_path = tmp_path / "delete.vault"
    master_pass = "Pass123!"

    init_vault(vault_path, master_pass)
    from vault.core.storage import save_vault, delete_entry_from_vault
    save_vault(vault_path, {"version": 1, "entries": {"svc1": {"username": "u1"}, "svc2": {"username": "u2"}}}, master_pass)

    # Delete svc1
    removed = delete_entry_from_vault(vault_path, master_pass, "svc1")
    assert removed is True

    data = load_vault(vault_path, master_pass)
    assert "svc1" not in data["entries"]
    assert "svc2" in data["entries"]

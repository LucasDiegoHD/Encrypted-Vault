"""
LockPy Vault - Native Host IPC Unit Tests
Verifies JSON message handling for browser extensions.
"""

from vault.core.storage import init_vault, save_vault
from vault.ipc.native_host import handle_request


def test_handle_ping_request():
    res = handle_request({"action": "ping"})
    assert res["status"] == "ok"
    assert res["message"] == "pong"
    assert res["version"] == "1.0.0"


def test_handle_missing_master_password():
    res = handle_request({"action": "get_credentials", "service": "github.com"})
    assert res["status"] == "error"
    assert "Missing master_password" in res["message"]


def test_handle_get_credentials_and_list_services(tmp_path, monkeypatch):
    vault_path = tmp_path / "ipc_test.vault"
    master_pass = "IpcSecret123!"

    # Mock get_default_vault_path to point to tmp_path
    monkeypatch.setattr(
        "vault.ipc.native_host.get_default_vault_path", lambda: vault_path
    )

    init_vault(vault_path, master_pass)
    vault_data = {
        "version": 1,
        "entries": {
            "github.com": {
                "username": "user123",
                "password": "SecretPassword123!",
                "url": "https://github.com",
            }
        },
    }
    save_vault(vault_path, vault_data, master_pass)

    # Test list_services
    list_res = handle_request(
        {"action": "list_services", "master_password": master_pass}
    )
    assert list_res["status"] == "ok"
    assert list_res["services"] == ["github.com"]

    # Test get_credentials
    get_res = handle_request(
        {
            "action": "get_credentials",
            "master_password": master_pass,
            "service": "github.com",
        }
    )
    assert get_res["status"] == "ok"
    assert get_res["credentials"]["username"] == "user123"
    assert get_res["credentials"]["password"] == "SecretPassword123!"

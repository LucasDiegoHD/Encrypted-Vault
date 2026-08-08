"""
LockPy Vault - GUI Unit Tests
Verifies CustomTkinter application instantiation and controller states.
"""

from unittest.mock import MagicMock
from vault.gui.app import LockPyGUI


def test_gui_instantiation(tmp_path, monkeypatch):
    """Verifies that LockPyGUI can be instantiated and initialized with a vault path."""
    vault_path = tmp_path / "gui_test.vault"

    # Mock tkinter mainloop to prevent blocking test runner
    monkeypatch.setattr("customtkinter.CTk.mainloop", MagicMock())

    app = LockPyGUI(vault_path=vault_path)
    assert app.vault_path == vault_path
    assert app.master_password is None
    assert app.vault_data is None

    app.destroy()

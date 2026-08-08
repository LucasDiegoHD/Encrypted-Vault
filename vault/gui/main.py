"""
LockPy Vault GUI Main Entry Point.
Executes the CustomTkinter graphical desktop user interface.
"""

import sys
from pathlib import Path
from vault.gui.app import run_gui


def main():
    vault_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    run_gui(vault_path=vault_path)


if __name__ == "__main__":
    main()

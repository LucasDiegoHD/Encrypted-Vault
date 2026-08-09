"""
Encrypted Vault GUI Main Entry Point.
Launches the modern Electron + React graphical desktop application.
"""

import sys
import subprocess
import shutil
from pathlib import Path


def main():
    root_dir = Path(__file__).resolve().parent.parent.parent
    desktop_dir = root_dir / "desktop"

    npm_path = shutil.which("npm") or shutil.which("npm.cmd")
    if desktop_dir.exists() and npm_path:
        print("🚀 Launching Encrypted Vault Desktop Application...")
        subprocess.run([npm_path, "start"], cwd=desktop_dir)
    else:
        from vault.gui.app import run_gui
        vault_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
        run_gui(vault_path=vault_path)


if __name__ == "__main__":
    main()

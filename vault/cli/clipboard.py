"""
LockPy Vault - Clipboard Auto-Wipe
Copies secret to system clipboard and automatically overwrites/clears it after 15 seconds.
"""

import threading
import time

try:
    import pyperclip

    HAS_PYPERCLIP = True
except ImportError:
    HAS_PYPERCLIP = False


def copy_with_autowipe(secret_text: str, timeout_seconds: int = 15) -> bool:
    """
    Copies the secret_text to the system clipboard and launches a daemon thread
    that automatically wipes the clipboard after timeout_seconds.
    """
    if not HAS_PYPERCLIP:
        return False

    try:
        pyperclip.copy(secret_text)
    except Exception:
        return False

    def _wipe_worker(original_secret: str, delay: int):
        time.sleep(delay)
        try:
            current_clip = pyperclip.paste()
            # Only wipe if clipboard still contains the original copied secret
            if current_clip == original_secret:
                pyperclip.copy("")
        except Exception:  # nosec B110
            pass

    timer_thread = threading.Thread(
        target=_wipe_worker, args=(secret_text, timeout_seconds), daemon=True
    )
    timer_thread.start()
    return True

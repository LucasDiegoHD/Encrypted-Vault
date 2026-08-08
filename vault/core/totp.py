# LockPy Vault - Pure Python RFC 6238 TOTP Engine
import hmac
import hashlib
import time
import base64
import struct

def generate_totp(secret: str, time_step: int = 30, digits: int = 6) -> dict:
    """
    Generates an RFC 6238 compliant TOTP token and remaining seconds.
    Zero external dependencies (uses standard library hmac, hashlib, base64).
    """
    if not secret:
        return {"code": "", "time_remaining": 0, "status": "empty"}

    # Clean secret and add base32 padding if missing
    secret_clean = secret.upper().replace(" ", "").replace("-", "")
    missing_padding = len(secret_clean) % 8
    if missing_padding:
        secret_clean += "=" * (8 - missing_padding)

    try:
        key = base64.b32decode(secret_clean, casefold=True)
    except Exception as err:
        return {"code": "", "time_remaining": 0, "status": "error", "error": f"Invalid Base32: {err}"}

    now = int(time.time())
    time_remaining = time_step - (now % time_step)
    counter = now // time_step

    # Pack 8-byte big-endian counter
    msg = struct.pack(">Q", counter)

    # Compute HMAC-SHA1
    hmac_hash = hmac.new(key, msg, hashlib.sha1).digest()

    # Dynamic truncation
    offset = hmac_hash[-1] & 0x0F
    code_int = (struct.unpack(">I", hmac_hash[offset:offset+4])[0] & 0x7FFFFFFF) % (10 ** digits)

    code_str = str(code_int).zfill(digits)
    return {
        "status": "ok",
        "code": code_str,
        "time_remaining": time_remaining,
        "step": time_step
    }

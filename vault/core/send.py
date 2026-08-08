# LockPy Vault - LockPy Send Core Engine (Zero-Knowledge One-Time Ephemeral Secrets)
import os
import json
import time
import base64
from vault.core.crypto import encrypt_bytes, decrypt_bytes

def create_ephemeral_send(secret_text: str, expire_seconds: int = 86400, max_views: int = 1) -> dict:
    """
    Creates a zero-knowledge encrypted ephemeral payload for secure sharing.
    The encryption key is placed in the URL hash fragment (#key=...) so it never reaches any server.
    """
    if not secret_text:
        return {"status": "error", "message": "Secret content cannot be empty."}

    # Generate a random 32-byte key for this specific link
    one_time_key = os.urandom(32)
    key_b64 = base64.urlsafe_b64encode(one_time_key).decode('utf-8')

    now = int(time.time())
    expire_at = now + expire_seconds if expire_seconds != 0 else 0

    # Encrypt secret using one-time key
    payload_data = json.dumps({
        "secret": secret_text,
        "created_at": now,
        "expire_at": expire_at,
        "max_views": max_views
    }).encode('utf-8')

    encrypted_payload = encrypt_bytes(payload_data, one_time_key)
    payload_b64 = base64.urlsafe_b64encode(json.dumps(encrypted_payload).encode('utf-8')).decode('utf-8')

    send_id = base64.urlsafe_b64encode(os.urandom(9)).decode('utf-8')

    # Construct zero-knowledge client-side URL
    share_url = f"http://127.0.0.1:54321/send/view?id={send_id}#payload={payload_b64}&key={key_b64}"

    return {
        "status": "ok",
        "send_id": send_id,
        "share_url": share_url,
        "created_at": now,
        "expire_at": expire_at,
        "max_views": max_views,
        "payload_b64": payload_b64,
        "key_b64": key_b64
    }

def read_ephemeral_send(payload_b64: str, key_b64: str) -> dict:
    """
    Decrypts and verifies an ephemeral send payload on the client side.
    """
    try:
        one_time_key = base64.urlsafe_b64decode(key_b64)
        encrypted_json = json.loads(base64.urlsafe_b64decode(payload_b64).decode('utf-8'))
        decrypted_bytes = decrypt_bytes(encrypted_json, one_time_key)
        data = json.loads(decrypted_bytes.decode('utf-8'))

        now = int(time.time())
        if data.get("expire_at") and data["expire_at"] > 0 and now > data["expire_at"]:
            return {"status": "error", "message": "This secure link has expired."}

        return {
            "status": "ok",
            "secret": data["secret"],
            "created_at": data.get("created_at"),
            "max_views": data.get("max_views")
        }
    except Exception as err:
        return {"status": "error", "message": f"Failed to decrypt send payload: {err}"}

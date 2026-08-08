import pytest
import time
from vault.core.send import create_ephemeral_send, read_ephemeral_send

def test_create_and_read_ephemeral_send():
    secret = "SuperSecretPassword123!"
    res = create_ephemeral_send(secret, expire_seconds=3600, max_views=1)
    assert res["status"] == "ok"
    assert "share_url" in res
    assert "key_b64" in res
    assert "payload_b64" in res

    # Read back
    read_res = read_ephemeral_send(res["payload_b64"], res["key_b64"])
    assert read_res["status"] == "ok"
    assert read_res["secret"] == secret

def test_read_expired_send():
    secret = "ExpiredSecret"
    # Create with -1 second expiration
    res = create_ephemeral_send(secret, expire_seconds=-10)
    assert res["status"] == "ok"

    read_res = read_ephemeral_send(res["payload_b64"], res["key_b64"])
    assert read_res["status"] == "error"
    assert "expired" in read_res["message"].lower()

def test_read_invalid_key():
    secret = "Secret"
    res = create_ephemeral_send(secret)
    read_res = read_ephemeral_send(res["payload_b64"], "InvalidKeyBase64==")
    assert read_res["status"] == "error"

"""
LockPy Vault - Cryptographic Engine Unit Tests
Verifies encryption/decryption integrity, KDF derivation, and CSPRNG generation.
"""

import pytest
from vault.core.crypto import (
    derive_key,
    encrypt_vault,
    decrypt_vault,
    generate_secure_password,
    CryptoError,
    SALT_SIZE,
    KEY_SIZE,
)


def test_key_derivation_length():
    salt = b"0123456789abcdef"
    master_pass = "SuperSecretPassword123!"

    key_argon2 = derive_key(master_pass, salt, method="argon2id")
    assert len(key_argon2) == KEY_SIZE

    key_pbkdf2 = derive_key(master_pass, salt, method="pbkdf2")
    assert len(key_pbkdf2) == KEY_SIZE
    assert key_argon2 != key_pbkdf2  # Different algorithms produce different keys


def test_encrypt_decrypt_roundtrip():
    master_pass = "CorrectHorseBatteryStaple!2026"
    data = {
        "version": 1,
        "entries": {
            "github.com": {
                "username": "octocat",
                "password": "M7$vK#9pL!2qW8xZ",
                "url": "https://github.com/login",
            }
        },
    }

    encrypted = encrypt_vault(data, master_pass)
    assert len(encrypted) > SALT_SIZE + 12 + 16

    decrypted = decrypt_vault(encrypted, master_pass)
    assert decrypted == data


def test_decrypt_with_wrong_password_fails():
    master_pass = "MySecretPassphrase"
    wrong_pass = "WrongSecretPassphrase"
    data = {"secret": "top_secret_data"}

    encrypted = encrypt_vault(data, master_pass)

    with pytest.raises(CryptoError, match="Decryption failed"):
        decrypt_vault(encrypted, wrong_pass)


def test_decrypt_tampered_data_fails():
    master_pass = "MasterKey123"
    data = {"key": "value"}

    encrypted = bytearray(encrypt_vault(data, master_pass))
    # Flip bytes in ciphertext
    encrypted[-1] ^= 0xFF

    with pytest.raises(CryptoError):
        decrypt_vault(bytes(encrypted), master_pass)


def test_generate_secure_password():
    pwd = generate_secure_password(
        length=24, include_symbols=True, include_numbers=True
    )
    assert len(pwd) == 24
    assert any(c.isupper() for c in pwd)
    assert any(c.islower() for c in pwd)
    assert any(c.isdigit() for c in pwd)

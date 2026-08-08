"""
LockPy Vault - Cryptographic Engine
Implements KDF (Argon2id / PBKDF2-HMAC-SHA256) and Symmetric Authenticated Encryption (AES-256-GCM).
"""

import json
import os
import secrets
import string
from typing import Dict, Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

try:
    import argon2
    import argon2.low_level

    HAS_ARGON2 = True
except ImportError:
    HAS_ARGON2 = False


SALT_SIZE = 16  # 128-bit Salt
NONCE_SIZE = 12  # 96-bit AES-GCM Nonce
KEY_SIZE = 32  # 256-bit Key

# Argon2id Parameters
ARGON2_TIME_COST = 3
ARGON2_MEMORY_COST = 65536  # 64 MB
ARGON2_PARALLELISM = 4

# PBKDF2 Parameters (Fallback)
PBKDF2_ITERATIONS = 600_000


class CryptoError(Exception):
    """Exception thrown during cryptographic operations."""

    pass


def derive_key(master_password: str, salt: bytes, method: str = "argon2id") -> bytes:
    """
    Derives a 256-bit symmetric key from a master password and salt using Argon2id or PBKDF2-HMAC-SHA256.
    """
    if not isinstance(master_password, str) or not master_password:
        raise CryptoError("Master password must be a non-empty string.")
    if len(salt) != SALT_SIZE:
        raise CryptoError(f"Salt must be exactly {SALT_SIZE} bytes.")

    password_bytes = master_password.encode("utf-8")

    if method == "argon2id" and HAS_ARGON2:
        try:
            raw_hash = argon2.low_level.hash_secret_raw(
                secret=password_bytes,
                salt=salt,
                time_cost=ARGON2_TIME_COST,
                memory_cost=ARGON2_MEMORY_COST,
                parallelism=ARGON2_PARALLELISM,
                hash_len=KEY_SIZE,
                type=argon2.low_level.Type.ID,
            )
            return raw_hash
        except Exception as err:
            raise CryptoError(f"Argon2id key derivation failed: {err}") from err
    else:
        # Fallback to PBKDF2-HMAC-SHA256
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=KEY_SIZE,
            salt=salt,
            iterations=PBKDF2_ITERATIONS,
        )
        return kdf.derive(password_bytes)


def encrypt_vault(
    vault_data: Dict[str, Any], master_password: str, kdf_method: str = "argon2id"
) -> bytes:
    """
    Encrypts a vault payload dictionary with AES-256-GCM.
    Binary layout: [1 byte KDF flag] + [16 bytes Salt] + [12 bytes Nonce] + [Ciphertext + Auth Tag]
    KDF flag: 0x01 for Argon2id, 0x02 for PBKDF2
    """
    try:
        plaintext = json.dumps(vault_data, ensure_ascii=False).encode("utf-8")
    except Exception as err:
        raise CryptoError(f"Failed to serialize vault data to JSON: {err}") from err

    salt = os.urandom(SALT_SIZE)
    nonce = os.urandom(NONCE_SIZE)

    use_method = "argon2id" if (kdf_method == "argon2id" and HAS_ARGON2) else "pbkdf2"
    kdf_flag = b"\x01" if use_method == "argon2id" else b"\x02"

    key = derive_key(master_password, salt, method=use_method)
    aesgcm = AESGCM(key)

    ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data=kdf_flag)
    return kdf_flag + salt + nonce + ciphertext


def decrypt_vault(encrypted_bytes: bytes, master_password: str) -> Dict[str, Any]:
    """
    Decrypts an AES-256-GCM encrypted vault payload.
    Validates payload structure and AEAD authentication tag.
    """
    min_length = 1 + SALT_SIZE + NONCE_SIZE + 16  # Flag + Salt + Nonce + Min Auth Tag
    if len(encrypted_bytes) < min_length:
        raise CryptoError("Encrypted payload is corrupted or truncated.")

    salt_end = 1 + SALT_SIZE
    nonce_end = salt_end + NONCE_SIZE

    kdf_flag = encrypted_bytes[:1]
    salt = encrypted_bytes[1:salt_end]
    nonce = encrypted_bytes[salt_end:nonce_end]
    ciphertext = encrypted_bytes[nonce_end:]

    if kdf_flag == b"\x01":
        method = "argon2id"
    elif kdf_flag == b"\x02":
        method = "pbkdf2"
    else:
        raise CryptoError("Unknown KDF algorithm flag in vault payload.")

    key = derive_key(master_password, salt, method=method)
    aesgcm = AESGCM(key)

    try:
        plaintext = aesgcm.decrypt(nonce, ciphertext, associated_data=kdf_flag)
        return json.loads(plaintext.decode("utf-8"))
    except Exception as err:
        raise CryptoError(
            "Decryption failed. Incorrect master password or corrupted vault."
        ) from err


def generate_password(
    length: int = 20,
    use_upper: bool = True,
    use_lower: bool = True,
    use_digits: bool = True,
    use_symbols: bool = True,
) -> str:
    """
    Generates a cryptographically secure random password.
    """
    if length < 8:
        raise CryptoError("Password length must be at least 8 characters.")

    char_pools = []
    if use_lower:
        char_pools.append(string.ascii_lowercase)
    if use_upper:
        char_pools.append(string.ascii_uppercase)
    if use_digits:
        char_pools.append(string.digits)
    if use_symbols:
        char_pools.append("!@#$%^&*()_+-=[]{}|;:,.<>?")

    if not char_pools:
        raise CryptoError("At least one character type must be selected.")

    # Guarantee at least one character from each selected pool
    password_chars = [secrets.choice(pool) for pool in char_pools]

    all_chars = "".join(char_pools)
    remaining_length = length - len(password_chars)
    password_chars.extend(secrets.choice(all_chars) for _ in range(remaining_length))

    # Cryptographically shuffle the resulting character list
    secrets.SystemRandom().shuffle(password_chars)
    return "".join(password_chars)


def generate_secure_password(length: int = 20, include_symbols: bool = True, include_numbers: bool = True) -> str:
    return generate_password(length=length, use_symbols=include_symbols, use_digits=include_numbers)


def encrypt_bytes(data: bytes, key: bytes) -> dict:
    """
    Encrypts raw bytes using AES-256-GCM with a 256-bit symmetric key.
    Returns dict with base64 encoded nonce and ciphertext.
    """
    if len(key) != KEY_SIZE:
        raise CryptoError(f"Key must be {KEY_SIZE} bytes.")
    nonce = os.urandom(NONCE_SIZE)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, data, None)
    import base64
    return {
        "nonce": base64.b64encode(nonce).decode("utf-8"),
        "ciphertext": base64.b64encode(ciphertext).decode("utf-8")
    }


def decrypt_bytes(encrypted_dict: dict, key: bytes) -> bytes:
    """
    Decrypts AES-256-GCM encrypted dict payload with key.
    """
    if len(key) != KEY_SIZE:
        raise CryptoError(f"Key must be {KEY_SIZE} bytes.")
    import base64
    try:
        nonce = base64.b64decode(encrypted_dict["nonce"])
        ciphertext = base64.b64decode(encrypted_dict["ciphertext"])
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ciphertext, None)
    except Exception as err:
        raise CryptoError(f"Decryption failed: {err}") from err

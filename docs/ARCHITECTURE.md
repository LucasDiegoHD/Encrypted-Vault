# LockPy Vault - System Architecture & Security Design

## 1. Zero-Knowledge Model

LockPy Vault operates under a strict **Zero-Knowledge** model:
- Master passwords are never written to disk or transmitted across any network.
- All encryption and decryption operations occur strictly in local process memory.
- Dynamic key derivation occurs on demand using random CSPRNG salts.

---

## 2. Cryptographic Flow

```
                  +-----------------------------------+
                  |      User Master Passphrase       |
                  +-----------------------------------+
                                    |
                                    v
                     +-----------------------------+
                     |  Salt (16 bytes, os.urandom)|
                     +-----------------------------+
                                    |
                                    v
            +-----------------------------------------------+
            |  Argon2id (t=3, m=64MB, p=4) / PBKDF2 fallback |
            +-----------------------------------------------+
                                    |
                                    v
                    +--------------------------------+
                    |  256-bit Symmetric Master Key  |
                    +--------------------------------+
                                    |
                                    v
                 +--------------------------------------+
                 |  AES-256-GCM Authenticated Encrypt   |
                 |   Nonce: 12 bytes CSPRNG             |
                 |   Auth Tag: 128-bit integrity check  |
                 +--------------------------------------+
                                    |
                                    v
            +------------------------------------------------+
            | Output File: [Flag|Salt|Nonce|Ciphertext+Tag]  |
            +------------------------------------------------+
```

---

## 3. Atomic Storage Strategy

Default primary vault storage path: `~/.lockpy/vault.vault`

To eliminate risks of corrupted files during sudden shutdowns or power losses:
1. Data is written to a temporary file (`.vault_tmp_*.tmp`) in the destination directory.
2. `os.fsync()` forces the operating system to flush kernel cache to physical disk hardware.
3. `os.replace()` performs an atomic rename, instantaneously swapping the target vault file.

---

## 4. RAM Sanitation & Clipboard Auto-Wipe

- Secrets loaded into RAM are wrapped in `SecureBuffer` instances that call `ctypes.memset` / buffer zeroing upon garbage collection or context exit.
- When retrieving passwords via CLI, the decrypted password is copied to the clipboard and a background thread overwrites the clipboard buffer after 15 seconds.

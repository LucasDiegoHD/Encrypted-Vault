<div align="center">

  <img src="assets/banner.png" alt="Encrypted Vault Banner" width="100%" style="border-radius: 12px; margin-bottom: 20px;">

  # 🔐 Encrypted Vault (Aegis-CLI)

  **A High-Security, Local Password Manager & 2FA Vault**

  [![CI Pipeline](https://github.com/lockpy/lockpy-vault/actions/workflows/ci.yml/badge.svg)](https://github.com/lockpy/lockpy-vault/actions)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Python Version](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12-blue)](https://www.python.org/)
  [![Security: Bandit SAST](https://img.shields.io/badge/security-Bandit%20Passed-brightgreen)](https://github.com/PyCQA/bandit)
  [![Code Style: Black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

  [Features](#-key-features) •
  [Architecture](#-cryptographic-architecture) •
  [Quick Start](#-quick-start) •
  [Browser Extension](#-browser-extension-installation--native-host-setup) •
  [CLI Commands](#-cli-command-reference) •
  [Credits](#-credits--acknowledgments)

</div>

---

## 🌟 Overview

**Encrypted Vault** is an open-source, local-first password manager engineered with modern cryptographic primitives (**Argon2id + AES-256-GCM**), RAM memory sanitation, and atomic storage guarantees. 

It provides seamless credential management across multiple interfaces: an interactive **Rich CLI**, a sleek **CustomTkinter Desktop GUI**, and a **Manifest V3 Chrome/Firefox Extension** connected via Native Messaging IPC.

> [!NOTE]
> **Powered by LockPy Engine**: Encrypted Vault utilizes the **LockPy** core security library (`vault.core`) for key derivation, RAM memory wiping, and secure atomic storage primitives.

---

## 📸 Desktop Application Interface

<div align="center">

  | Unlock Screen | Main Vault Dashboard |
  | :---: | :---: |
  | <img src="assets/screenshot_login.png" alt="Unlock Screen" width="480"> | <img src="assets/screenshot_dashboard.png" alt="Dashboard Screen" width="480"> |

</div>

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 🛡️ **Local-First Architecture** | Passwords are never sent across a network. Encryption occurs locally using keys derived on demand. |
| 🔑 **Argon2id + AES-256-GCM** | State-of-the-art key derivation (Argon2id: 64MB RAM, 3 iterations) and authenticated 256-bit AES-GCM encryption. |
| 🖥️ **Sleek Dark Desktop GUI** | Modern graphical user interface built with CustomTkinter for easy management of vaults and TOTP keys. |
| ⚡ **Rich Terminal CLI** | Full-featured command-line interface with interactive prompts, colored tables, and quick secret access. |
| 🌐 **Browser Autofill Integration** | Native Messaging IPC Host connecting Chrome/Firefox Manifest V3 extension directly to your local vault. |
| 📲 **RFC 6238 TOTP Authenticator** | Pure Python 2FA token generator with built-in QR code scanning tool (`otpauth://`). |
| 🔗 **Ephemeral Send** | Link sharing for secrets with single-use view count and expiration timers. |
| 💾 **Encrypted Backup & Recovery** | Import/export `.lockpybk` encrypted vaults and generate 12-word BIP39 Emergency Recovery Seeds. |
| 🧹 **RAM Sanitation & Auto-Wipe** | Secrets wrapped in `SecureBuffer` RAM zero-fill containers and 15-second clipboard auto-wipe. |
| ⚡ **Atomic Storage Engine** | Write-to-temp file + `fsync` + atomic rename strategy guaranteeing vault integrity against crash/power loss. |

---

## 🏗️ Cryptographic Architecture

```mermaid
flowchart TD
    MP["User Master Passphrase"] -->|Salt: 16-byte CSPRNG| KDF{"Key Derivation Engine\nArgon2id (t=3, m=64MB, p=4)\n[Fallback: PBKDF2 600k iter]"}
    KDF -->|Derived 256-bit Key| AES["AES-256-GCM Authenticated Encryption\n(Nonce: 12-byte CSPRNG)"]
    AES -->|AEAD Auth Tag 128-bit| CIPHER["Ciphertext Output"]
    CIPHER -->|Atomic Write + fsync| FILE["[ Flag (1B) | Salt (16B) | Nonce (12B) | Ciphertext + Tag ]\n(~/.lockpy/vault.vault)"]
```

---

## 🌐 Browser Extension IPC Protocol

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser as Chrome/Firefox Extension (MV3)
    participant NativeHost as Native Host IPC (stdin/stdout)
    participant Vault as Encrypted Vault (~/.lockpy)

    User->>Browser: Click Autofill / Unlock
    Browser->>NativeHost: JSON IPC Request (action: "unlock", master_password: "...")
    NativeHost->>Vault: Read & Decrypt Vault with Argon2id + AES-GCM
    Vault-->>NativeHost: Decrypted Credentials Payload
    NativeHost-->>Browser: JSON Response (services, username, password, TOTP)
    Browser-->>User: Auto-fills login form & TOTP code
```

---

## 🚀 Quick Start

### 1. Installation

Clone the repository and install dependencies:

```bash
# Clone repository
git clone https://github.com/your-username/encrypted-vault.git
cd encrypted-vault

# Install required dependencies
pip install -r requirements.txt
```

> [!NOTE]
> **Default Vault File Location**: By default, Encrypted Vault initializes and manages its primary encrypted database file named **`vault.vault`** stored in `~/.lockpy/vault.vault` (inside the user's home directory).

### 2. Launch Graphical Desktop App (GUI)

```bash
python -m vault.gui.main
```

### 3. Initialize & Use via Terminal CLI

```bash
# Initialize a new encrypted vault
python -m vault.cli.main init

# Add a credential
python -m vault.cli.main add --service github.com --username octocat --url https://github.com

# Retrieve credential & copy password (clipboard auto-wipes after 15s)
python -m vault.cli.main get github.com

# Generate a 24-character secure password
python -m vault.cli.main generate --length 24 --copy
```

---

## 💻 CLI Command Reference

| Command | Usage | Description |
| :--- | :--- | :--- |
| `init` | `python -m vault.cli.main init` | Create a new encrypted vault file |
| `add` | `python -m vault.cli.main add --service <name>` | Store new credentials in the vault |
| `get` | `python -m vault.cli.main get <service>` | Decrypt & copy service password to clipboard |
| `list` | `python -m vault.cli.main list` | List all stored service domains |
| `generate` | `python -m vault.cli.main generate -l 24 -c` | Generate cryptographically secure password |
| `totp` | `python -m vault.cli.main totp <service>` | Display current 6-digit TOTP 2FA code |
| `send` | `python -m vault.cli.main send --text "secret"` | Create single-use share link |
| `backup` | `python -m vault.cli.main backup --out backup.lockpybk` | Export encrypted backup |
| `gui` | `python -m vault.cli.main gui` | Launch Graphical Desktop Application |

---

## 🌐 Browser Extension Installation & Native Host Setup

Encrypted Vault includes a **Manifest V3 browser extension** (`extension/` folder) for Chrome, Brave, Edge, and Firefox. It connects securely to your local vault via the Native Messaging Host daemon (`vault/ipc/native_host.py`) for one-click password and 2FA autofill.

### Step 1: Install the Extension in Your Browser

#### 🟦 Chrome / Chromium / Edge / Brave
1. Open your browser and navigate to `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode** (toggle in the top right corner).
3. Click **Load unpacked** (*Carregar sem compactação*).
4. Select the **`extension`** folder inside this repository.
5. Copy the generated **Extension ID** (e.g. `knkjbchdflkbae...`).

#### 🦊 Mozilla Firefox
1. Navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...** (*Carregar extensão temporária*).
3. Select the `extension/manifest.json` file.

---

### Step 2: Register the Native Host Bridge (IPC Daemon)

#### 🪟 Windows (Automatic Setup)
Simply run the registration script from the repository root:
```cmd
register_extension.bat
```
*This registers the `com.lockpy.vault` host manifest into the Windows Registry under `HKCU\Software\Google\Chrome\NativeMessagingHosts`.*

#### 🐧 Linux & 🍎 macOS (Manual Setup)
Refer to the complete step-by-step registration guide in **[docs/NATIVE_MESSAGING.md](docs/NATIVE_MESSAGING.md)**.

---

## 🎯 Threat Model & Security Guarantees

For complete disclosure policy and vulnerability reports, please refer to **[.github/SECURITY.md](.github/SECURITY.md)**.

| Threat / Risk | Status | Mitigation Strategy |
| :--- | :---: | :--- |
| **Physical Disk Theft / Stolen Device** | 🛡️ Protected | Vault database (`vault.vault`) is encrypted with **Argon2id + AES-256-GCM**. Data cannot be read without the Master Password. |
| **Man-in-the-Middle (MITM) Network Interception** | 🛡️ Protected | Local-first architecture. No vault secrets ever traverse network adapters or external servers. |
| **Process Memory Dump** | 🛡️ Protected | Secrets loaded into RAM use `SecureBuffer` containers with zero-fill memory wiping on garbage collection (`memory.py`). |
| **Clipboard History Snooping** | 🛡️ Protected | Background thread automatically purges passwords copied from CLI after 15 seconds. |
| **Power Loss / Disk Corruption** | 🛡️ Protected | Atomic write strategy (`atomic_write`) flushes temporary files to disk with `os.fsync` before swapping target file. |
| **Infected Host with Kernel Keylogger** | ⚠️ Out of Scope | If the OS kernel or memory space is fully compromised by malware with root privileges, host isolation cannot be guaranteed. |

---

## 🧪 Testing & Security Auditing

Encrypted Vault includes an extensive test suite and automated static security analysis (SAST):

```bash
# Run unit tests with coverage report
python -m pytest --cov=vault tests/

# Run Bandit SAST security audit
bandit -r vault/

# Check code formatting & style
black --check vault/ tests/
flake8 vault/ tests/
```

---

## 📁 Repository Structure

```
encrypted-vault/
├── assets/
│   └── banner.png                # GitHub Header Banner
├── docs/
│   ├── ARCHITECTURE.md           # System & Cryptographic Architecture
│   └── NATIVE_MESSAGING.md       # Browser IPC Setup Guide
├── extension/                    # Manifest V3 Chrome/Firefox Extension
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   └── popup.html
├── vault/                        # Main Python Application Package
│   ├── core/                     # Crypto, Storage, Memory, TOTP, Send, Backup (LockPy Engine)
│   ├── cli/                      # Rich Terminal CLI Interface
│   ├── gui/                      # CustomTkinter Dark Mode GUI
│   ├── ipc/                      # Native Messaging Host Daemon
│   └── tools/                    # QR Scanner & Helpers
├── tests/                        # Pytest Test Suite
├── .github/                      # CI/CD Workflows & Security Policies
├── register_extension.bat        # Windows Native Host Registrar
├── requirements.txt              # Dependencies
└── README.md                     # Documentation
```

---

## 🤝 Credits & Acknowledgments

**Encrypted Vault** is powered by the **LockPy** core security engine (`vault.core`), which provides key derivation (Argon2id), authenticated encryption (AES-256-GCM), RAM memory protection (`SecureBuffer`), atomic storage guarantees, and pure Python RFC 6238 TOTP authentication. 

Special credits and acknowledgments to the **LockPy** core library.

---

## 📄 License & Disclaimer

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

> [!WARNING]
> **Security Disclaimer**: Encrypted Vault implements local encryption. Store your Master Password securely. If lost, your encrypted data cannot be decrypted or recovered.

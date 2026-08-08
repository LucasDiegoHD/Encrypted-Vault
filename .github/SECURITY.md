# Security Policy & Vulnerability Disclosure

LockPy Vault takes security and cryptography with utmost seriousness. If you believe you have discovered a security vulnerability or cryptographic weakness, we appreciate your help in disclosing it to us responsibly.

---

## 🛡️ Supported Versions

We provide security updates and patches for the following versions:

| Version | Supported |
| ------- | --------- |
| 1.0.x   | ✅ Yes    |
| < 1.0.0 | ❌ No     |

---

## 🔒 Reporting a Vulnerability

**Please DO NOT open a public GitHub issue for security vulnerabilities.**

Instead, please follow these steps:

1. **Email Contact**: Send a security advisory or report directly to the repository maintainers.
2. **Details to Include**:
   - Type of issue (e.g., cryptographic key derivation flaw, memory leak, IPC permission bypass).
   - Step-by-step instructions to reproduce the issue.
   - Proof of Concept (PoC) code or demonstration, if applicable.
   - Impact assessment.

---

## ⏱️ Response & Disclosure Timeline

- **Acknowledgment**: We aim to acknowledge receipt of your vulnerability report within **48 hours**.
- **Assessment**: We will investigate and confirm the issue within **5 business days**.
- **Fix & Advisory**: A patch will be prepared, tested, and released as quickly as possible. We will coordinate public disclosure after a patch is available.

---

## 🎯 Security Guarantees & Threat Model

Encrypted Vault is designed under a **Zero-Knowledge** architecture powered by the LockPy security engine:

### What Encrypted Vault Protects Against
- ✅ **Offline Disk Extraction / Stolen Hardware**: Vault files (`vault.vault` & `.lockpybk`) are encrypted using **Argon2id + AES-256-GCM**. Without the master password, data cannot be recovered.
- ✅ **Network Sniffing & MITM**: No vault credentials or master passwords are ever transmitted over the network.
- ✅ **Clipboard Snooping**: Passwords copied to the clipboard are automatically erased after 15 seconds.
- ✅ **File Corruption**: Atomic file writes guarantee that power failure during saving will not corrupt the existing vault database.

### Out of Scope / Host Compromise Assumptions
- ❌ **Active Kernel Keyloggers / Rootkits**: If the user host operating system is already infected with malicious software capturing keystrokes or reading arbitrary process memory with administrative privileges, no client-side password manager can guarantee complete isolation.

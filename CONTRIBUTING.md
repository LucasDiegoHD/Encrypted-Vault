# Contributing to LockPy Vault

Thank you for your interest in contributing to **LockPy Vault**! We welcome bug fixes, documentation improvements, and new security features.

---

## Development Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/lockpy-vault.git
   cd lockpy-vault
   ```

2. **Create a Virtual Environment**:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

---

## Coding Guidelines & Standards

Before submitting a Pull Request, verify that your code adheres to:

1. **Code Formatting**:
   ```bash
   black --check vault/ tests/
   flake8 vault/ tests/
   ```

2. **Security Audit (Bandit SAST)**:
   ```bash
   bandit -r vault/
   ```

3. **Unit Tests & Coverage**:
   ```bash
   pytest --cov=vault tests/
   ```

---

## Pull Request Process

1. Fork the repository and create your branch from `main`.
2. Ensure all unit tests and security checks pass.
3. Update documentation if introducing new CLI flags or configuration parameters.
4. Submit a Pull Request following the PR template.

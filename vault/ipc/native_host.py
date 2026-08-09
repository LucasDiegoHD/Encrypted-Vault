# LockPy Vault Native Host / Daemon API Protocol
import json
import os
import sys
import urllib.parse
import struct
from vault.core.crypto import generate_secure_password
from vault.core.storage import get_default_vault_path, load_vault, save_vault, init_vault

def get_vault_path():
    return str(get_default_vault_path())

def vault_exists():
    return os.path.exists(get_vault_path())

def process_ipc_request(req):
    action = req.get("action")
    if not action:
        return {"status": "error", "message": "Missing action parameter."}

    if action == "ping":
        return {"status": "ok", "message": "pong", "version": "1.0.0"}

    master_password = req.get("master_password")
    if not master_password and action not in ["generate_password", "scan_qr", "generate_alias", "read_send"]:
        return {"status": "error", "message": "Missing master_password parameter."}

    vault_path = get_vault_path()

    if action == "check_vault":
        return {"status": "ok", "exists": vault_exists()}

    if action == "generate_password":
        length = req.get("length", 16)
        use_symbols = req.get("use_symbols", True)
        return {"status": "ok", "password": generate_secure_password(length=length, use_symbols=use_symbols)}

    if action == "unlock":
        if not vault_exists():
            try:
                init_vault(vault_path, master_password)
            except Exception as e:
                return {"status": "error", "message": f"Erro ao criar cofre: {e}"}
        try:
            vault_data = load_vault(vault_path, master_password)
            entries = vault_data.get("entries", {})
            from vault.core.totp import generate_totp
            processed_entries = {}
            for name, item in entries.items():
                t_secret = item.get("totp_secret", "")
                t_info = generate_totp(t_secret) if t_secret else {}
                processed_entries[name] = {
                    "username": item.get("username", ""),
                    "password": item.get("password", ""),
                    "url": item.get("url", ""),
                    "totp_secret": t_secret,
                    "totp_code": t_info.get("code", ""),
                    "totp_time_remaining": t_info.get("time_remaining", 0)
                }
            return {
                "status": "ok",
                "message": "Vault unlocked successfully.",
                "services": list(entries.keys()),
                "entries": processed_entries
            }
        except Exception as e:
            return {"status": "error", "message": "Senha Mestre incorreta ou cofre corrompido."}

    if action == "create_vault":
        if vault_exists():
            return {"status": "error", "message": "Vault file already exists."}
        try:
            init_vault(vault_path, master_password)
            return {"status": "ok", "message": "Vault created successfully."}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # Decrypt vault for all storage actions
    if not vault_exists():
        try:
            init_vault(vault_path, master_password)
        except Exception as e:
            return {"status": "error", "message": "Cofre não encontrado."}

    try:
        vault_data = load_vault(vault_path, master_password)
        entries = vault_data.get("entries", {})
    except Exception as e:
        return {"status": "error", "message": "Master password incorreta."}

    if action == "list_services":
        return {
            "status": "ok",
            "services": list(entries.keys())
        }

    elif action == "get_credentials":
        service = req.get("service")
        if not service:
            return {"status": "error", "message": "Missing service parameter."}

        url_param = req.get("url") or req.get("service") or ""
        url_clean = url_param.lower().strip()

        if "://" in url_clean:
            url_clean = urllib.parse.urlparse(url_clean).netloc.lower()

        url_clean = url_clean.replace("www.", "")
        parts = url_clean.split(".")
        base_domain = ".".join(parts[-2:]) if len(parts) >= 2 else url_clean
        brand_name = parts[-2] if len(parts) >= 2 else parts[0]

        matching_entries = []

        # 1. Exact match by saved 'url' field in entries
        for s_name, item in entries.items():
            saved_url = (item.get("url") or "").lower().strip()
            if saved_url:
                if "://" in saved_url:
                    saved_url = urllib.parse.urlparse(saved_url).netloc.lower()
                saved_url = saved_url.replace("www.", "")
                if base_domain and (saved_url == base_domain or saved_url == url_clean):
                    matching_entries.append((s_name, item))

        # 2. Match by service name or domain parts
        if not matching_entries:
            for s_name, item in entries.items():
                s_lower = s_name.lower().strip()
                s_clean = s_lower.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]

                if (
                    s_clean == url_clean
                    or s_clean == base_domain
                    or (len(brand_name) >= 3 and s_clean == brand_name)
                ):
                    matching_entries.append((s_name, item))

        if not matching_entries:
            return {
                "status": "ok",
                "credentials": None,
                "matches": [],
                "message": "Nenhuma credencial cadastrada para este site."
            }

        from vault.core.totp import generate_totp

        matched_name, matched_entry = matching_entries[0]
        all_matches = []
        for name, item in matching_entries:
            t_secret = item.get("totp_secret", "")
            t_info = generate_totp(t_secret) if t_secret else {}
            all_matches.append({
                "service": name,
                "username": item.get("username", ""),
                "password": item.get("password", ""),
                "url": item.get("url", ""),
                "totp_secret": t_secret,
                "totp_code": t_info.get("code", ""),
                "totp_time_remaining": t_info.get("time_remaining", 0)
            })

        t_secret = matched_entry.get("totp_secret", "")
        t_info = generate_totp(t_secret) if t_secret else {}

        return {
            "status": "ok",
            "service": matched_name,
            "credentials": {
                "username": matched_entry.get("username", ""),
                "password": matched_entry.get("password", ""),
                "url": matched_entry.get("url", ""),
                "totp_secret": t_secret,
                "totp_code": t_info.get("code", ""),
                "totp_time_remaining": t_info.get("time_remaining", 0)
            },
            "matches": all_matches
        }

    elif action == "add_credential":
        service = req.get("service")
        username = req.get("username")
        password = req.get("password")
        url_val = req.get("url", "")
        totp_secret = req.get("totp_secret", "")

        if not service or not username or not password:
            return {"status": "error", "message": "Service, username and password are required."}

        entries[service] = {
            "username": username,
            "password": password,
            "url": url_val,
            "totp_secret": totp_secret
        }
        vault_data["entries"] = entries
        save_vault(vault_path, vault_data, master_password)
        return {"status": "ok", "message": f"Credential for '{service}' added successfully."}

    elif action == "delete_credential":
        service = req.get("service")
        if not service or service not in entries:
            return {"status": "error", "message": "Service not found in vault."}

        del entries[service]
        vault_data["entries"] = entries
        save_vault(vault_path, vault_data, master_password)
        return {"status": "ok", "message": f"Credential for '{service}' deleted."}

    elif action == "change_master_password":
        new_password = req.get("new_master_password")
        if not new_password:
            return {"status": "error", "message": "New master password required."}

        from vault.core.storage import reencrypt_vault
        reencrypt_vault(vault_path, master_password, new_password)
        return {"status": "ok", "message": "Master password updated successfully."}

    elif action == "export_backup":
        backup_password = req.get("backup_password")
        out_path = req.get("output_path")
        if not backup_password or not out_path:
            return {"status": "error", "message": "Backup password and output_path required."}

        from vault.core.backup import export_encrypted_backup
        return export_encrypted_backup(vault_path, master_password, backup_password, out_path)

    elif action == "import_backup":
        backup_password = req.get("backup_password")
        in_path = req.get("input_path")
        if not backup_password or not in_path:
            return {"status": "error", "message": "Backup password and input_path required."}

        from vault.core.backup import import_encrypted_backup
        return import_encrypted_backup(vault_path, master_password, backup_password, in_path)

    elif action == "scan_qr":
        from vault.tools.qr_scanner import scan_screen_qr, parse_otpauth_url
        qr_text = req.get("qr_text")
        if qr_text:
            return parse_otpauth_url(qr_text)
        return scan_screen_qr()

    elif action == "generate_alias":
        from vault.core.alias import generate_email_alias
        prefix = req.get("prefix", "vault")
        domain = req.get("domain")
        return generate_email_alias(prefix=prefix, domain=domain)

    elif action == "check_alias_inbox":
        from vault.core.alias import check_alias_inbox
        email = req.get("email", "")
        return check_alias_inbox(email)

    elif action == "read_alias_message":
        from vault.core.alias import read_alias_message
        email = req.get("email", "")
        message_id = req.get("message_id", 0)
        return read_alias_message(email, message_id)

    elif action == "create_send":
        from vault.core.send import create_ephemeral_send
        secret_text = req.get("secret_text", "")
        expire_seconds = req.get("expire_seconds", 86400)
        max_views = req.get("max_views", 1)
        return create_ephemeral_send(secret_text, expire_seconds=expire_seconds, max_views=max_views)

    elif action == "read_send":
        from vault.core.send import read_ephemeral_send
        payload_b64 = req.get("payload_b64", "")
        key_b64 = req.get("key_b64", "")
        return read_ephemeral_send(payload_b64, key_b64)

    return {"status": "error", "message": f"Unknown action '{action}'."}

handle_request = process_ipc_request

def main():
    """
    Reads Chrome Native Messaging / IPC stdin requests and returns responses.
    """
    try:
        raw_length = sys.stdin.buffer.read(4)
        if not raw_length or len(raw_length) < 4:
            # Fallback to plain stdin text
            raw_text = sys.stdin.read()
            if raw_text:
                req = json.loads(raw_text)
                res = process_ipc_request(req)
                res_bytes = json.dumps(res).encode('utf-8')
                sys.stdout.buffer.write(struct.pack('@I', len(res_bytes)))
                sys.stdout.buffer.write(res_bytes)
                sys.stdout.buffer.flush()
            return

        message_length = struct.unpack('@I', raw_length)[0]
        raw_message = sys.stdin.buffer.read(message_length)
        req = json.loads(raw_message.decode('utf-8'))

        res = process_ipc_request(req)
        res_bytes = json.dumps(res).encode('utf-8')

        sys.stdout.buffer.write(struct.pack('@I', len(res_bytes)))
        sys.stdout.buffer.write(res_bytes)
        sys.stdout.buffer.flush()
    except Exception as err:
        error_res = {"status": "error", "message": str(err)}
        error_bytes = json.dumps(error_res).encode('utf-8')
        try:
            sys.stdout.buffer.write(struct.pack('@I', len(error_bytes)))
            sys.stdout.buffer.write(error_bytes)
            sys.stdout.buffer.flush()
        except Exception:
            pass

if __name__ == "__main__":
    main()

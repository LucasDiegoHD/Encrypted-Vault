# LockPy Vault - Robust Screen QR Code Scanner (cv2 + pyzbar + PIL)
import re
import urllib.parse

def parse_otpauth_url(otpauth_url: str) -> dict:
    """
    Parses an otpauth:// URL or raw Base32 string into secret, issuer, and label.
    Example: otpauth://totp/Google:user@gmail.com?secret=JBSWY3DPEHPK3PXP&issuer=Google
    """
    if not otpauth_url:
        return {"status": "error", "message": "Empty URL"}

    otpauth_url = otpauth_url.strip()

    if not otpauth_url.startswith("otpauth://"):
        secret_clean = re.sub(r'[^A-Za-z2-7]', '', otpauth_url).upper()
        if len(secret_clean) >= 8:
            return {"status": "ok", "secret": secret_clean, "issuer": "", "label": ""}
        return {"status": "error", "message": "Invalid OTP Auth URL or Base32 Secret"}

    try:
        parsed = urllib.parse.urlparse(otpauth_url)
        params = urllib.parse.parse_qs(parsed.query)

        secret = params.get("secret", [""])[0].upper()
        issuer = params.get("issuer", [""])[0]

        label = parsed.path.lstrip("/")
        if ":" in label:
            issuer_from_label, label = label.split(":", 1)
            if not issuer:
                issuer = issuer_from_label

        if not secret:
            return {"status": "error", "message": "Missing secret in otpauth URL"}

        return {
            "status": "ok",
            "secret": secret,
            "issuer": issuer,
            "label": label
        }
    except Exception as err:
        return {"status": "error", "message": str(err)}

def scan_screen_qr() -> dict:
    """
    Scans the active primary screen for 2FA QR Codes using OpenCV (cv2.QRCodeDetector)
    or pyzbar/PIL. Zero missing dependency errors.
    """
    # Attempt 1: OpenCV QRCodeDetector (Native C++, highly reliable on Windows)
    try:
        import cv2
        import numpy as np
        from PIL import ImageGrab

        img = ImageGrab.grab()
        img_np = np.array(img)
        img_cv = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)

        detector = cv2.QRCodeDetector()
        data, points, _ = detector.detectAndDecode(img_cv)

        if data:
            res = parse_otpauth_url(data)
            if res["status"] == "ok":
                return res

        # Try multi QR detect
        retval, decoded_info, points, _ = detector.detectAndDecodeMulti(img_cv)
        if retval:
            for d in decoded_info:
                if d:
                    res = parse_otpauth_url(d)
                    if res["status"] == "ok":
                        return res
    except Exception:
        pass

    # Attempt 2: pyzbar fallback
    try:
        from PIL import ImageGrab
        from pyzbar.pyzbar import decode

        img = ImageGrab.grab()
        decoded_objs = decode(img)
        for obj in decoded_objs:
            data_str = obj.data.decode('utf-8')
            res = parse_otpauth_url(data_str)
            if res["status"] == "ok":
                return res
    except Exception:
        pass

    return {
        "status": "error",
        "message": "Nenhum QR Code de 2FA encontrado na tela. Certifique-se de que o QR Code do site está visível."
    }

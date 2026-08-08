import pytest
from vault.tools.qr_scanner import parse_otpauth_url

def test_parse_otpauth_url_valid():
    url = "otpauth://totp/Google:user@gmail.com?secret=JBSWY3DPEHPK3PXP&issuer=Google"
    res = parse_otpauth_url(url)
    assert res["status"] == "ok"
    assert res["secret"] == "JBSWY3DPEHPK3PXP"
    assert res["issuer"] == "Google"

def test_parse_otpauth_url_raw_secret():
    res = parse_otpauth_url("JBSWY3DPEHPK3PXP")
    assert res["status"] == "ok"
    assert res["secret"] == "JBSWY3DPEHPK3PXP"

def test_parse_otpauth_url_invalid():
    res = parse_otpauth_url("short")
    assert res["status"] == "error"

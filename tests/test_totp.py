import pytest
from vault.core.totp import generate_totp

def test_generate_totp_valid_secret():
    # Base32 for "Hello!" is JBSWY3DPEHPK3PXP
    res = generate_totp("JBSWY3DPEHPK3PXP")
    assert res["status"] == "ok"
    assert len(res["code"]) == 6
    assert res["code"].isdigit()
    assert 1 <= res["time_remaining"] <= 30

def test_generate_totp_with_spaces_dashes():
    res1 = generate_totp("JBSWY3DPEHPK3PXP")
    res2 = generate_totp("JBSW-Y3DP-EHPK-3PXP")
    res3 = generate_totp("jbsw y3dp ehpk 3pxp")
    assert res1["code"] == res2["code"] == res3["code"]

def test_generate_totp_empty_secret():
    res = generate_totp("")
    assert res["status"] == "empty"
    assert res["code"] == ""

def test_generate_totp_invalid_base32():
    res = generate_totp("!!!INVALID_BASE32!!!")
    assert res["status"] == "error"

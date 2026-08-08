import pytest
from vault.core.alias import generate_email_alias, apply_gmail_dot_trick

def test_generate_email_alias():
    res = generate_email_alias()
    assert res["status"] == "ok"
    assert "@gmail.com" in res["alias"]
    assert "+" not in res["alias"]
    assert "." in res["alias"]

def test_apply_gmail_dot_trick():
    alias = apply_gmail_dot_trick("depepepe")
    assert "@gmail.com" in alias
    assert "+" not in alias
    assert "." in alias

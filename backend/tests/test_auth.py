"""
Tests for auth routes:
  POST /api/v1/auth/signup
  POST /api/v1/auth/login
  GET  /api/v1/auth/me

Each test is fully self-contained.
The clean_db fixture in conftest.py wipes all tables after every test.
"""

import pytest


# Helpers

SIGNUP_URL = "/api/v1/auth/signup"
LOGIN_URL  = "/api/v1/auth/login"
ME_URL     = "/api/v1/auth/me"

VALID_USER = {
    "name":     "Priya Sharma",
    "email":    "priya@example.com",
    "password": "secret123",
    "phone":    "9876543210",
}


def signup_and_get_token(client, user=None):
    """Helper — signs up a user and returns (token, user_dict)."""
    payload = user or VALID_USER
    res = client.post(SIGNUP_URL, json=payload)
    assert res.status_code == 201, f"signup failed: {res.get_json()}"
    data = res.get_json()
    return data["token"], data["user"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


# Signup tests

class TestSignup:

    def test_signup_success_returns_201_with_token_and_user(self, client):
        res = client.post(SIGNUP_URL, json=VALID_USER)
        assert res.status_code == 201
        data = res.get_json()
        assert "token" in data
        assert data["user"]["email"] == VALID_USER["email"]
        assert data["user"]["role"] == "customer"
        # password must never be in the response
        assert "password" not in data["user"]
        assert "password_hash" not in data["user"]

    def test_signup_duplicate_email_returns_409(self, client):
        client.post(SIGNUP_URL, json=VALID_USER)          # first signup
        res = client.post(SIGNUP_URL, json=VALID_USER)    # duplicate
        assert res.status_code == 409
        data = res.get_json()
        assert data["error"] == "Conflict"

    def test_signup_missing_name_returns_400(self, client):
        payload = {**VALID_USER, "name": ""}
        res = client.post(SIGNUP_URL, json=payload)
        assert res.status_code == 400
        data = res.get_json()
        assert data["error"] == "Validation error"
        assert "name" in data["messages"]

    def test_signup_missing_email_returns_400(self, client):
        payload = {**VALID_USER, "email": ""}
        res = client.post(SIGNUP_URL, json=payload)
        assert res.status_code == 400
        assert "email" in res.get_json()["messages"]

    def test_signup_missing_password_returns_400(self, client):
        payload = {**VALID_USER, "password": ""}
        res = client.post(SIGNUP_URL, json=payload)
        assert res.status_code == 400
        assert "password" in res.get_json()["messages"]

    def test_signup_missing_phone_returns_400(self, client):
        payload = {**VALID_USER, "phone": ""}
        res = client.post(SIGNUP_URL, json=payload)
        assert res.status_code == 400
        assert "phone" in res.get_json()["messages"]

    def test_signup_short_password_returns_400(self, client):
        payload = {**VALID_USER, "password": "abc"}
        res = client.post(SIGNUP_URL, json=payload)
        assert res.status_code == 400
        assert "password" in res.get_json()["messages"]

    def test_signup_no_body_returns_400(self, client):
        res = client.post(SIGNUP_URL)
        assert res.status_code == 400

    def test_signup_email_stored_lowercase(self, client):
        payload = {**VALID_USER, "email": "PRIYA@EXAMPLE.COM"}
        res = client.post(SIGNUP_URL, json=payload)
        assert res.status_code == 201
        assert res.get_json()["user"]["email"] == "priya@example.com"


# Login tests

class TestLogin:

    def test_login_success_returns_200_with_token(self, client):
        signup_and_get_token(client)
        res = client.post(LOGIN_URL, json={
            "email":    VALID_USER["email"],
            "password": VALID_USER["password"],
        })
        assert res.status_code == 200
        data = res.get_json()
        assert "token" in data
        assert data["user"]["email"] == VALID_USER["email"]

    def test_login_wrong_password_returns_401(self, client):
        signup_and_get_token(client)
        res = client.post(LOGIN_URL, json={
            "email":    VALID_USER["email"],
            "password": "wrongpassword",
        })
        assert res.status_code == 401
        assert res.get_json()["error"] == "Unauthorized"

    def test_login_unknown_email_returns_401(self, client):
        res = client.post(LOGIN_URL, json={
            "email":    "ghost@example.com",
            "password": "anything",
        })
        assert res.status_code == 401

    def test_login_missing_email_returns_400(self, client):
        res = client.post(LOGIN_URL, json={"password": "secret123"})
        assert res.status_code == 400
        assert "email" in res.get_json()["messages"]

    def test_login_missing_password_returns_400(self, client):
        res = client.post(LOGIN_URL, json={"email": "priya@example.com"})
        assert res.status_code == 400
        assert "password" in res.get_json()["messages"]

    def test_login_no_body_returns_400(self, client):
        res = client.post(LOGIN_URL)
        assert res.status_code == 400

    def test_login_case_insensitive_email(self, client):
        signup_and_get_token(client)
        res = client.post(LOGIN_URL, json={
            "email":    "PRIYA@EXAMPLE.COM",   # uppercase
            "password": VALID_USER["password"],
        })
        assert res.status_code == 200


# Me tests

class TestMe:

    def test_me_returns_current_user(self, client):
        token, created_user = signup_and_get_token(client)
        res = client.get(ME_URL, headers=auth_header(token))
        assert res.status_code == 200
        data = res.get_json()
        assert data["id"] == created_user["id"]
        assert data["email"] == VALID_USER["email"]
        assert data["role"] == "customer"

    def test_me_without_token_returns_401(self, client):
        res = client.get(ME_URL)
        assert res.status_code == 401
        assert res.get_json()["error"] == "Unauthorized"

    def test_me_with_invalid_token_returns_401(self, client):
        res = client.get(ME_URL, headers={"Authorization": "Bearer not-a-real-token"})
        assert res.status_code == 401

    def test_me_response_has_no_password(self, client):
        token, _ = signup_and_get_token(client)
        data = client.get(ME_URL, headers=auth_header(token)).get_json()
        assert "password" not in data
        assert "password_hash" not in data

    def test_me_contains_all_expected_fields(self, client):
        token, _ = signup_and_get_token(client)
        data = client.get(ME_URL, headers=auth_header(token)).get_json()
        for field in ("id", "name", "email", "phone", "role", "created_at"):
            assert field in data, f"Missing field: {field}"
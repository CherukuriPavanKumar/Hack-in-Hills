"""
Security regression tests for Phase 1 model provider security,
API key non-leakage, SSRF boundaries, and production role minting protections.
"""

import pytest
from fastapi.testclient import TestClient

from apps.api.core.auth import Role, create_signed_token
from apps.api.core.config import settings
from apps.api.main import app, init_db_and_seed
from services.providers.base import ModelMessage, ProviderError, ProviderRequest
from services.providers.gemini_provider import GeminiProvider, sanitize_gemini_secret
from services.providers.openai_provider import OpenAIProvider, sanitize_secret_text

init_db_and_seed()
client = TestClient(app)


def test_models_endpoint_has_no_secrets():
    """Verify GET /api/models exposes model metadata without leaking secrets or tokens."""
    token = create_signed_token(Role.OPERATOR)
    res = client.get("/api/models", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    models = res.json()
    assert isinstance(models, list)
    assert len(models) >= 2

    forbidden_keys = ["api_key", "secret", "password", "token", "credentials", "auth"]
    for m in models:
        assert "id" in m
        assert "provider" in m
        assert "is_mock" in m
        assert "available" in m
        # Ensure no secret fields exist in dictionary
        for k in m.keys():
            assert k.lower() not in forbidden_keys
        # Ensure description does not leak env strings
        assert "sk-" not in m.get("description", "")


def test_production_role_minting_protection():
    """
    In production mode without demo token role selection, acquiring privileged
    roles (operator/blue_team/red_team) without the master secret MUST be blocked with 403.
    """
    orig_env = settings.APP_ENV
    orig_demo = settings.ALLOW_DEMO_TOKEN_ROLE_SELECTION
    orig_secret = settings.OPERATOR_MASTER_SECRET

    try:
        settings.APP_ENV = "production"
        settings.ALLOW_DEMO_TOKEN_ROLE_SELECTION = False
        settings.OPERATOR_MASTER_SECRET = "production-master-secret-9999"

        # 1. Unprivileged attempt to mint operator token -> 403
        res = client.post("/api/auth/token", json={"role": "operator"})
        assert res.status_code == 403
        assert "Privileged role token minting requires valid 'X-Bayora-Master-Key'" in res.json()["detail"]

        # 2. Invalid master secret -> 403
        res = client.post(
            "/api/auth/token",
            json={"role": "operator"},
            headers={"X-Bayora-Master-Key": "wrong-secret"},
        )
        assert res.status_code == 403
        assert "Privileged role token minting requires valid 'X-Bayora-Master-Key'" in res.json()["detail"]

        # 3. Valid master secret -> 200
        res = client.post(
            "/api/auth/token",
            json={"role": "operator"},
            headers={"X-Bayora-Master-Key": "production-master-secret-9999"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "operator"
        assert "access_token" in data

    finally:
        settings.APP_ENV = orig_env
        settings.ALLOW_DEMO_TOKEN_ROLE_SELECTION = orig_demo
        settings.OPERATOR_MASTER_SECRET = orig_secret


def test_openai_api_key_redaction():
    """Ensure OpenAI secret keys are masked in string representations and error messages."""
    secret = "sk-live-abc123xyz789supersecretkey"
    leak_text = f"Connection to https://api.openai.com failed with Bearer {secret}"
    cleaned = sanitize_secret_text(leak_text, secret)
    assert secret not in cleaned
    assert "[REDACTED_API_KEY]" in cleaned


def test_gemini_api_key_redaction():
    """Ensure Gemini secret keys and URL query parameters are thoroughly redacted."""
    secret = "AIzaSySecretGoogleGeminiKey12345"
    url_text = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5:generateContent?key={secret}"
    cleaned = sanitize_gemini_secret(url_text, secret)
    assert secret not in cleaned
    assert "[REDACTED_GEMINI_KEY]" in cleaned


def test_run_creation_fails_closed_when_provider_unavailable():
    """Verify create_run returns HTTP 400 when requesting a provider that is not configured."""
    token = create_signed_token(Role.OPERATOR)

    # Attempt to use a real provider when credentials are intentionally missing
    orig_key = settings.OPENAI_API_KEY
    orig_base = settings.OPENAI_BASE_URL
    try:
        settings.OPENAI_API_KEY = ""
        settings.OPENAI_BASE_URL = "https://api.openai.com/v1"

        payload = {
            "suite_id": "bayora-adv-safety-v1",
            "suite_version": "1.0.0",
            "model_id": "gpt-4o",
            "model_version": "v1",
            "policy_id": "baseline-guard-v1.0",
            "policy_version": "1.0.0",
            "provider": "openai",
        }
        res = client.post(
            "/api/runs",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 400
        assert "not configured with valid server credentials" in res.json()["detail"]
    finally:
        settings.OPENAI_API_KEY = orig_key
        settings.OPENAI_BASE_URL = orig_base

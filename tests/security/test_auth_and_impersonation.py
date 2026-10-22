"""
Regression and Adversarial Tests for Bayora Authentication & Authorization
Verifies signed token verification, role enforcement, and prevents header spoofing / impersonation.
"""

import pytest
from fastapi.testclient import TestClient
from apps.api.main import app, init_db_and_seed
from apps.api.core.auth import Role, create_signed_token

init_db_and_seed()
client = TestClient(app)


def test_auth_token_issuance():
    """Verify that backend issues valid signed session tokens for roles."""
    for role in [Role.OPERATOR, Role.BLUE_TEAM, Role.RED_TEAM, Role.AUDITOR]:
        res = client.post("/api/auth/token", json={"role": role.value})
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == role.value
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "." in data["access_token"]


def test_reject_raw_header_spoofing():
    """
    Attempt to impersonate Operator by directly injecting 'X-Bayora-Role: operator'
    without a valid signed Authorization token. Must be REJECTED with 401 Unauthorized.
    """
    res = client.get("/api/runs", headers={"X-Bayora-Role": "operator"})
    assert res.status_code == 401
    assert "Direct role spoofing via 'X-Bayora-Role" in res.json()["detail"]


def test_reject_missing_authentication():
    """Requests without Authorization token to protected endpoints must return 401."""
    res = client.get("/api/runs")
    assert res.status_code == 401
    assert "Authentication required" in res.json()["detail"]


def test_reject_tampered_token_signature():
    """Modifying token payload or signature must be detected and rejected."""
    token = create_signed_token(Role.OPERATOR)
    parts = token.split(".")
    # Tamper with signature
    tampered_token = f"{parts[0]}.forged_invalid_signature"
    res = client.get("/api/runs", headers={"Authorization": f"Bearer {tampered_token}"})
    assert res.status_code == 401
    assert "signature mismatch" in res.json()["detail"]


def test_reject_role_header_mismatch_with_token():
    """Client with Red Team token cannot claim X-Bayora-Role: operator."""
    red_token = create_signed_token(Role.RED_TEAM)
    res = client.get(
        "/api/runs",
        headers={
            "Authorization": f"Bearer {red_token}",
            "X-Bayora-Role": "operator",
        },
    )
    assert res.status_code == 403
    assert "Role mismatch" in res.json()["detail"]


def test_red_team_cannot_author_policies():
    """Red team signed session is forbidden from creating Blue defense policies."""
    red_token = create_signed_token(Role.RED_TEAM)
    payload = {
        "name": "Malicious Red Policy",
        "version": "9.9.9",
        "rules_json": {"blocked_keywords": []},
    }
    res = client.post(
        "/api/policies",
        headers={"Authorization": f"Bearer {red_token}"},
        json=payload,
    )
    assert res.status_code == 403
    assert "Forbidden" in res.json()["detail"]


def test_auditor_cannot_author_policies_or_create_runs():
    """Auditor role is read-only compliance; cannot create policies or runs."""
    auditor_token = create_signed_token(Role.AUDITOR)

    # 1. Cannot create policy
    res_pol = client.post(
        "/api/policies",
        headers={"Authorization": f"Bearer {auditor_token}"},
        json={"name": "Auditor Policy", "version": "1.0", "rules_json": {}},
    )
    assert res_pol.status_code == 403

    # 2. Cannot create run
    res_run = client.post(
        "/api/runs",
        headers={"Authorization": f"Bearer {auditor_token}"},
        json={
            "suite_id": "bayora-adv-safety-v1",
            "model_id": "mock-deterministic-v1",
            "policy_id": "baseline-guard-v1.0",
        },
    )
    assert res_run.status_code == 403


def test_blue_team_cannot_view_unredacted_attack_payloads():
    """
    Blue team members cannot view raw attack prompts in advance.
    Verifies server-side sanitization.
    """
    op_token = create_signed_token(Role.OPERATOR)
    blue_token = create_signed_token(Role.BLUE_TEAM)

    runs = client.get("/api/runs", headers={"Authorization": f"Bearer {op_token}"}).json()
    run_id = runs[0]["id"]

    # As Blue Team
    res_blue = client.get(f"/api/runs/{run_id}", headers={"Authorization": f"Bearer {blue_token}"})
    assert res_blue.status_code == 200
    detail = res_blue.json()
    for tc in detail["test_cases"]:
        if len(tc["prompt"]) > 20:
            assert "[REDACTED PAYLOAD" in tc["prompt"]


def test_red_team_cannot_view_confidential_blue_policy_rules():
    """Red team cannot view internal regex/keywords in defense policies."""
    red_token = create_signed_token(Role.RED_TEAM)
    res = client.get("/api/policies", headers={"Authorization": f"Bearer {red_token}"})
    assert res.status_code == 200
    policies = res.json()
    for p in policies:
        assert p["rules_json"].get("redacted") is True
        assert "confidential and hidden from Red team" in p["rules_json"].get("reason", "")


def test_auditor_canary_tokens_masked():
    """Auditor sees canary tokens masked to prevent exfiltration leakage."""
    auditor_token = create_signed_token(Role.AUDITOR)
    op_token = create_signed_token(Role.OPERATOR)

    runs = client.get("/api/runs", headers={"Authorization": f"Bearer {op_token}"}).json()
    run_id = runs[0]["id"]

    res_auditor = client.get(f"/api/runs/{run_id}", headers={"Authorization": f"Bearer {auditor_token}"})
    assert res_auditor.status_code == 200
    detail = res_auditor.json()
    for tc in detail["test_cases"]:
        assert "CANARY-" not in tc["prompt"]

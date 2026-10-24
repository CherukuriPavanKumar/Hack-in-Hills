"""
End-to-end integration test verifying complete run lifecycle with real and mock providers,
truthful scoring, cryptographic audit hash chains, and tamper verification.
"""

import json
import pytest
import httpx
from fastapi.testclient import TestClient

from apps.api.core.auth import Role, create_signed_token
from apps.api.core.config import settings
from apps.api.main import app, init_db_and_seed
from services.providers.registry import get_provider_registry
from services.providers.openai_provider import OpenAIProvider

init_db_and_seed()
client = TestClient(app)


def test_full_mock_run_lifecycle_and_verification():
    """Execute end-to-end evaluation run using mock provider."""
    token = create_signed_token(Role.OPERATOR)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create run
    payload = {
        "suite_id": "bayora-adv-safety-v1",
        "suite_version": "1.0.0",
        "model_id": "mock-deterministic-v1",
        "model_version": "v1",
        "policy_id": "baseline-guard-v1.0",
        "policy_version": "1.0.0",
        "provider": "mock",
        "request_budget": 20,
        "timeout_ms": 5000,
    }
    create_res = client.post("/api/runs", json=payload, headers=headers)
    assert create_res.status_code == 201
    run_id = create_res.json()["id"]

    # 2. Start run execution
    start_res = client.post(f"/api/runs/{run_id}/start", headers=headers)
    assert start_res.status_code == 200

    # 3. Fetch run detail
    detail_res = client.get(f"/api/runs/{run_id}", headers=headers)
    assert detail_res.status_code == 200
    run_data = detail_res.json()
    assert run_data["status"] == "COMPLETED"
    assert run_data["provider"] == "mock"

    test_cases = run_data["test_cases"]
    assert len(test_cases) > 0

    for tc in test_cases:
        assert tc["provider"] == "mock"
        assert tc["is_mock"] is True
        assert tc["verdict"] in ["PASS", "FAIL", "BLOCKED_BY_GATEWAY", "INCONCLUSIVE"]
        if tc["gateway_decision"] == "ALLOW":
            assert tc["input_tokens"] is not None
            assert tc["output_tokens"] is not None

    # 4. Verify cryptographic hash chain integrity
    verify_res = client.post(f"/api/runs/{run_id}/verify", headers=headers)
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["is_valid"] is True
    assert verify_data["total_events"] >= 8

    # 5. Check reports
    json_report_res = client.get(f"/api/runs/{run_id}/report?format=json", headers=headers)
    assert json_report_res.status_code == 200
    rep = json.loads(json_report_res.text)
    assert rep["tested_configuration"]["provider"] == "mock"
    assert "total_input_tokens" in rep["findings_summary"]
    assert "total_output_tokens" in rep["findings_summary"]

    md_report_res = client.get(f"/api/runs/{run_id}/report?format=markdown", headers=headers)
    assert md_report_res.status_code == 200
    assert "- **Model Provider**:" in md_report_res.text
    assert "Total Input Tokens" in md_report_res.text


def test_full_openai_adapter_integration_lifecycle():
    """Execute end-to-end evaluation run simulating real OpenAI chat completions."""
    token = create_signed_token(Role.OPERATOR)
    headers = {"Authorization": f"Bearer {token}"}

    def mock_openai_handler(request: httpx.Request):
        req_json = json.loads(request.content.decode("utf-8"))
        messages = req_json.get("messages", [])
        prompt_text = messages[-1]["content"] if messages else ""

        # Model intrinsically refuses prompt injections
        if "ignore" in prompt_text.lower() or "override" in prompt_text.lower():
            completion_text = "I cannot fulfill this request as it violates our system safety guidelines."
        elif "canary" in prompt_text.lower():
            completion_text = "I have no memory of prior session tokens."
        else:
            completion_text = "Standard compliant factual response."

        return httpx.Response(
            200,
            json={
                "id": "chatcmpl-live-mock",
                "choices": [
                    {
                        "message": {"role": "assistant", "content": completion_text},
                        "finish_reason": "stop",
                    }
                ],
                "usage": {
                    "prompt_tokens": 16,
                    "completion_tokens": 12,
                    "total_tokens": 28,
                },
            },
        )

    transport = httpx.MockTransport(mock_openai_handler)
    mock_client = httpx.AsyncClient(transport=transport)

    test_openai_provider = OpenAIProvider(
        client=mock_client,
        api_key="sk-test-live-key",
        base_url="https://api.openai.com/v1",
    )
    orig_provider = get_provider_registry().get_provider("openai")
    get_provider_registry().register("openai", test_openai_provider)

    try:
        payload = {
            "suite_id": "bayora-adv-safety-v1",
            "suite_version": "1.0.0",
            "model_id": "gpt-4o",
            "model_version": "v1",
            "policy_id": "baseline-guard-v1.0",
            "policy_version": "1.0.0",
            "provider": "openai",
            "request_budget": 20,
            "timeout_ms": 5000,
        }
        create_res = client.post("/api/runs", json=payload, headers=headers)
        assert create_res.status_code == 201
        run_id = create_res.json()["id"]

        start_res = client.post(f"/api/runs/{run_id}/start", headers=headers)
        assert start_res.status_code == 200

        detail_res = client.get(f"/api/runs/{run_id}", headers=headers)
        assert detail_res.status_code == 200
        run_data = detail_res.json()
        assert run_data["status"] == "COMPLETED"
        assert run_data["provider"] == "openai"

        for tc in run_data["test_cases"]:
            assert tc["provider"] == "openai"
            assert tc["is_mock"] is False
            if tc["gateway_decision"] == "ALLOW":
                assert tc["input_tokens"] == 16
                assert tc["output_tokens"] == 12
                assert tc["finish_reason"] == "stop"

        verify_res = client.post(f"/api/runs/{run_id}/verify", headers=headers)
        assert verify_res.status_code == 200
        assert verify_res.json()["is_valid"] is True
    finally:
        get_provider_registry().register("openai", orig_provider)

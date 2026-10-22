import pytest
from fastapi.testclient import TestClient
from apps.api.main import app, init_db_and_seed
from apps.api.core.hash_chain import GENESIS_HASH, verify_chain

# Initialize database tables and seed data for tests
init_db_and_seed()
client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "bayora-control-plane"


def test_topology_endpoint():
    res = client.get("/api/topology")
    assert res.status_code == 200
    data = res.json()
    assert "zones" in data
    assert "routes" in data
    # Check that Red -> Target Direct is DENIED
    red_to_target = [r for r in data["routes"] if r["source"] == "RED_WORKSPACE" and r["target"] == "MODEL_ZONE"]
    assert len(red_to_target) == 1
    assert red_to_target[0]["permission"] == "DENIED"


def test_list_policies():
    res = client.get("/api/policies")
    assert res.status_code == 200
    policies = res.json()
    assert len(policies) >= 2
    policy_ids = [p["id"] for p in policies]
    assert "baseline-guard-v1.0" in policy_ids
    assert "hardened-strict-v2.1" in policy_ids


def test_role_based_policy_redaction():
    # As Red Team, blue defense rules must be redacted
    res_red = client.get("/api/policies", headers={"X-Bayora-Role": "red_team"})
    assert res_red.status_code == 200
    policies_red = res_red.json()
    for p in policies_red:
        assert p["rules_json"].get("redacted") is True

    # As Operator or Blue Team, rules must be visible
    res_op = client.get("/api/policies", headers={"X-Bayora-Role": "operator"})
    assert res_op.status_code == 200
    policies_op = res_op.json()
    baseline = next(p for p in policies_op if p["id"] == "baseline-guard-v1.0")
    assert "blocked_keywords" in baseline["rules_json"]


def test_seeded_run_and_integrity_verification():
    res = client.get("/api/runs")
    assert res.status_code == 200
    runs = res.json()
    assert len(runs) >= 1
    seed_run = next(r for r in runs if r["id"] == "run_seed_benchmark_01")
    assert seed_run["status"] == "COMPLETED"

    # Verify chain
    verify_res = client.post(f"/api/runs/{seed_run['id']}/verify")
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["is_valid"] is True
    assert verify_data["total_events"] > 0
    assert verify_data["mismatch_seq"] is None


def test_tamper_drill_detects_mutation_without_corrupting_real_db():
    res = client.get("/api/runs")
    seed_run = res.json()[0]

    # Run tamper drill on disposable copy
    tamper_res = client.post(f"/api/runs/{seed_run['id']}/tamper-drill?tamper_seq=2")
    assert tamper_res.status_code == 200
    tamper_data = tamper_res.json()
    assert tamper_data["tampered"] is True
    assert tamper_data["original_valid"] is True
    assert tamper_data["tampered_valid"] is False
    assert tamper_data["mismatch_seq"] == 2
    assert "Tamper detected!" in tamper_data["explanation"]

    # Verify that the REAL stored ledger remains intact and valid!
    verify_after = client.post(f"/api/runs/{seed_run['id']}/verify")
    assert verify_after.status_code == 200
    assert verify_after.json()["is_valid"] is True


def test_create_and_execute_fresh_run_lifecycle():
    # 1. Create run
    create_payload = {
        "suite_id": "bayora-adv-safety-v1",
        "suite_version": "1.0.0",
        "model_id": "mock-deterministic-v1",
        "model_version": "v1",
        "policy_id": "baseline-guard-v1.0",
        "policy_version": "1.0.0",
        "request_budget": 15,
        "timeout_ms": 5000,
    }
    create_res = client.post("/api/runs", json=create_payload)
    assert create_res.status_code == 201
    run_data = create_res.json()
    run_id = run_data["id"]
    assert run_data["status"] == "CREATED"
    assert run_data["clean_context_enforced"] is True

    # 2. Start run
    start_res = client.post(f"/api/runs/{run_id}/start")
    assert start_res.status_code == 200
    executed_run = start_res.json()
    assert executed_run["status"] == "COMPLETED"
    assert executed_run["score_summary"]["isolation_verified"] is True
    assert executed_run["score_summary"]["clean_context_verified"] is True

    # 3. Check probe results
    assert len(executed_run["probes"]) >= 5
    assert all(p["verdict"] == "PASS" for p in executed_run["probes"])

    # 4. Check test case results
    assert len(executed_run["test_cases"]) == 8

    # 5. Check chain verification
    verify_res = client.post(f"/api/runs/{run_id}/verify")
    assert verify_res.status_code == 200
    assert verify_res.json()["is_valid"] is True

    # 6. Check report generation
    rep_res = client.get(f"/api/runs/{run_id}/report?format=json")
    assert rep_res.status_code == 200
    report_data = rep_res.json()
    assert report_data["integrity_status"] == "VERIFIED"
    assert len(report_data["residual_risks"]) >= 3

    # 7. Check markdown report export
    md_res = client.get(f"/api/runs/{run_id}/report?format=markdown")
    assert md_res.status_code == 200
    assert "# BAYORA Executive Audit Report" in md_res.text


def test_run_diff_endpoint():
    runs = client.get("/api/runs").json()
    assert len(runs) >= 2
    run_a_id = runs[0]["id"]
    run_b_id = runs[1]["id"]

    diff_res = client.get(f"/api/diff?run_a_id={run_a_id}&run_b_id={run_b_id}")
    assert diff_res.status_code == 200
    diff_data = diff_res.json()
    assert "verdict_changes" in diff_data
    assert "latency_comparison" in diff_data

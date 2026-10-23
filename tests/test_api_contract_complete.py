"""
Comprehensive API Contract & Workflow Verification for Bayora
Validates all 15 endpoints in Section 5 of the specification:
1. GET /health
2. GET /topology
3. GET /runs
4. POST /runs
5. POST /runs/{id}/start
6. GET /runs/{id}
7. GET /runs/{id}/events
8. POST /runs/{id}/verify
9. POST /runs/{id}/tamper-drill?tamper_seq=2
10. GET /runs/{id}/report?format=json
11. GET /runs/{id}/report?format=markdown
12. GET /policies
13. POST /policies
14. POST /probes/execute
15. GET /diff?run_a_id={id}&run_b_id={id}
"""

import pytest
from fastapi.testclient import TestClient
from apps.api.main import app, init_db_and_seed
from apps.api.core.auth import Role, create_signed_token

init_db_and_seed()
client = TestClient(app)

# Helper headers for various roles
def auth_headers(role: Role):
    token = create_signed_token(role)
    return {
        "Authorization": f"Bearer {token}",
        "X-Bayora-Role": role.value,
    }


class TestBayoraApiContract:
    created_run_id = None
    seed_run_id = "run_seed_benchmark_01"

    def test_01_get_health(self):
        """1. GET /api/health"""
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["service"] == "bayora-control-plane"
        assert "timestamp" in data

    def test_02_get_topology(self):
        """2. GET /api/topology"""
        res = client.get("/api/topology")
        assert res.status_code == 200
        data = res.json()
        assert "zones" in data
        assert "routes" in data
        assert len(data["zones"]) == 4
        # Verify isolation routes
        routes = data["routes"]
        r2m = next(r for r in routes if r["source"] == "RED_WORKSPACE" and r["target"] == "MODEL_ZONE")
        assert r2m["permission"] == "DENIED"

    def test_03_get_runs(self):
        """3. GET /api/runs"""
        res = client.get("/api/runs", headers=auth_headers(Role.OPERATOR))
        assert res.status_code == 200
        runs = res.json()
        assert isinstance(runs, list)
        assert len(runs) >= 1
        assert any(r["id"] == self.seed_run_id for r in runs)

    def test_04_post_runs(self):
        """4. POST /api/runs"""
        payload = {
            "suite_id": "bayora-adv-safety-v1",
            "suite_version": "1.0.0",
            "model_id": "mock-deterministic-v1",
            "model_version": "v1",
            "policy_id": "baseline-guard-v1.0",
            "policy_version": "1.0.0",
            "request_budget": 20,
            "timeout_ms": 5000,
        }
        res = client.post("/api/runs", json=payload, headers=auth_headers(Role.OPERATOR))
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "CREATED"
        assert data["clean_context_enforced"] is True
        assert data["id"].startswith("run_")
        TestBayoraApiContract.created_run_id = data["id"]

    def test_05_post_runs_start(self):
        """5. POST /api/runs/{id}/start"""
        run_id = TestBayoraApiContract.created_run_id
        assert run_id is not None
        res = client.post(f"/api/runs/{run_id}/start", headers=auth_headers(Role.OPERATOR))
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "COMPLETED"
        assert len(data["test_cases"]) == 8
        assert len(data["probes"]) >= 5

    def test_06_get_run_detail(self):
        """6. GET /api/runs/{id}"""
        run_id = TestBayoraApiContract.created_run_id
        # As Operator: sees unmasked
        res_op = client.get(f"/api/runs/{run_id}", headers=auth_headers(Role.OPERATOR))
        assert res_op.status_code == 200
        data_op = res_op.json()
        assert data_op["id"] == run_id

        # As Blue Team: attack prompts masked
        res_blue = client.get(f"/api/runs/{run_id}", headers=auth_headers(Role.BLUE_TEAM))
        assert res_blue.status_code == 200
        data_blue = res_blue.json()
        masked_cases = [tc for tc in data_blue["test_cases"] if "REDACTED" in tc["prompt"]]
        assert len(masked_cases) > 0

    def test_07_get_run_events(self):
        """7. GET /api/runs/{id}/events"""
        run_id = TestBayoraApiContract.created_run_id
        res = client.get(f"/api/runs/{run_id}/events", headers=auth_headers(Role.OPERATOR))
        assert res.status_code == 200
        events = res.json()
        assert isinstance(events, list)
        assert len(events) >= 5
        # Verify sequential ordering
        for i, ev in enumerate(events):
            assert ev["seq"] == i + 1
            assert "event_hash" in ev
            assert "prev_hash" in ev

    def test_08_post_runs_verify(self):
        """8. POST /api/runs/{id}/verify"""
        run_id = TestBayoraApiContract.created_run_id
        res = client.post(f"/api/runs/{run_id}/verify", headers=auth_headers(Role.AUDITOR))
        assert res.status_code == 200
        data = res.json()
        assert data["is_valid"] is True
        assert data["total_events"] >= 5
        assert data["mismatch_seq"] is None

    def test_09_post_runs_tamper_drill(self):
        """9. POST /api/runs/{id}/tamper-drill?tamper_seq=2"""
        run_id = TestBayoraApiContract.created_run_id
        res = client.post(f"/api/runs/{run_id}/tamper-drill?tamper_seq=2", headers=auth_headers(Role.AUDITOR))
        assert res.status_code == 200
        drill = res.json()
        assert drill["tampered"] is True
        assert drill["original_valid"] is True
        assert drill["tampered_valid"] is False
        assert drill["tampered_seq"] == 2
        assert drill["mismatch_seq"] == 2
        assert drill["original_event_hash"] != drill["tampered_event_hash"]
        assert "Tamper detected!" in drill["explanation"]

        # Confirm original DB evidence remains 100% valid
        verify_again = client.post(f"/api/runs/{run_id}/verify", headers=auth_headers(Role.AUDITOR))
        assert verify_again.status_code == 200
        assert verify_again.json()["is_valid"] is True

    def test_10_get_run_report_json(self):
        """10. GET /api/runs/{id}/report?format=json"""
        run_id = TestBayoraApiContract.created_run_id
        res = client.get(f"/api/runs/{run_id}/report?format=json", headers=auth_headers(Role.OPERATOR))
        assert res.status_code == 200
        data = res.json()
        assert data["run_id"] == run_id
        assert data["integrity_status"] == "VERIFIED"
        assert "tested_configuration" in data
        assert "boundary_probes" in data
        assert "residual_risks" in data

    def test_11_get_run_report_markdown(self):
        """11. GET /api/runs/{id}/report?format=markdown"""
        run_id = TestBayoraApiContract.created_run_id
        res = client.get(f"/api/runs/{run_id}/report?format=markdown", headers=auth_headers(Role.OPERATOR))
        assert res.status_code == 200
        text = res.text
        assert "# BAYORA Executive Audit Report" in text
        assert run_id in text
        assert "Boundary Isolation Probes" in text
        assert "Tested Configuration" in text

    def test_12_get_policies(self):
        """12. GET /api/policies"""
        # Blue team sees rules
        res_blue = client.get("/api/policies", headers=auth_headers(Role.BLUE_TEAM))
        assert res_blue.status_code == 200
        policies = res_blue.json()
        assert len(policies) >= 2
        assert "blocked_keywords" in policies[0]["rules_json"]

        # Red team sees redacted rules
        res_red = client.get("/api/policies", headers=auth_headers(Role.RED_TEAM))
        assert res_red.status_code == 200
        red_policies = res_red.json()
        for p in red_policies:
            assert p["rules_json"].get("redacted") is True

    def test_13_post_policies(self):
        """13. POST /api/policies"""
        # Blue Team can author policies
        payload = {
            "name": "Hardened Banking Guard",
            "version": "3.0.0",
            "rules_json": {
                "blocked_keywords": ["transfer", "swift_code", "iban", "pin"],
                "regex_patterns": [r"(?i)bypass\s+auth"],
                "block_canary_tokens": True,
                "max_prompt_length": 2048,
            },
            "created_by": "blue_team",
        }
        res = client.post("/api/policies", json=payload, headers=auth_headers(Role.BLUE_TEAM))
        assert res.status_code == 201
        created = res.json()
        assert created["name"] == "Hardened Banking Guard"
        assert created["version"] == "3.0.0"
        assert len(created["policy_hash"]) == 64

        # Red Team is forbidden from creating policies
        res_red = client.post("/api/policies", json=payload, headers=auth_headers(Role.RED_TEAM))
        assert res_red.status_code == 403

    def test_14_post_probes_execute(self):
        """14. POST /api/probes/execute"""
        res = client.post("/api/probes/execute", headers=auth_headers(Role.OPERATOR))
        assert res.status_code == 200
        probes = res.json()
        assert isinstance(probes, list)
        assert len(probes) == 5
        probe_names = [p["probe_name"] for p in probes]
        assert "T1_RED_TO_BLUE_NETWORK" in probe_names
        assert "T2_BLUE_TO_RED_NETWORK" in probe_names
        assert "T3_DIRECT_MODEL_BYPASS" in probe_names
        assert "T4_RED_TO_GATEWAY_PERMITTED" in probe_names
        assert "T5_WORKSPACE_VOLUME_ISOLATION" in probe_names
        assert all(p["verdict"] == "PASS" for p in probes)

    def test_15_get_diff(self):
        """15. GET /api/diff?run_a_id={id}&run_b_id={id}"""
        runs = client.get("/api/runs", headers=auth_headers(Role.OPERATOR)).json()
        run_a = runs[0]["id"]
        run_b = runs[1]["id"]
        res = client.get(f"/api/diff?run_a_id={run_a}&run_b_id={run_b}", headers=auth_headers(Role.OPERATOR))
        assert res.status_code == 200
        diff = res.json()
        assert diff["run_a_id"] == run_a
        assert diff["run_b_id"] == run_b
        assert "run_a_policy" in diff
        assert "run_b_policy" in diff
        assert "verdict_changes" in diff
        assert "latency_comparison" in diff

"""
Live E2E Verification Script for Bayora
Tests live running backend at http://localhost:8000/api and frontend proxy at http://localhost:3000/api
"""
import httpx
import json

BASE = "http://localhost:8000/api"
FRONTEND_BASE = "http://localhost:3000/api"

def run_e2e_verification():
    print("=== STARTING LIVE BAYORA END-TO-END VERIFICATION ===")
    with httpx.Client(timeout=30.0) as client:
        # 1. Check direct backend health and frontend proxied health
        res_health = client.get(f"{BASE}/health")
        assert res_health.status_code == 200
        assert res_health.json()["status"] == "healthy"
        print("[PASS] Direct Backend Health (GET /api/health)")

        res_proxy = client.get(f"{FRONTEND_BASE}/health")
        assert res_proxy.status_code == 200
        assert res_proxy.json()["status"] == "healthy"
        print("[PASS] Frontend Proxied Health (GET http://localhost:3000/api/health)")

        # 2. Check topology
        res_topo = client.get(f"{BASE}/topology")
        assert res_topo.status_code == 200
        topo = res_topo.json()
        assert len(topo["zones"]) == 4
        assert len(topo["routes"]) == 5
        print("[PASS] 4-Zone Isolation Topology (GET /api/topology)")

        # 3. Authenticate all 4 roles via /api/auth/token
        tokens = {}
        for role in ["operator", "blue_team", "red_team", "auditor"]:
            r = client.post(f"{BASE}/auth/token", json={"role": role})
            assert r.status_code == 200
            tokens[role] = r.json()["access_token"]
        print("[PASS] Cryptographic Role Tokens Issued for Operator, Blue Team, Red Team, Auditor")

        op_headers = {"Authorization": f"Bearer {tokens['operator']}", "X-Bayora-Role": "operator"}
        blue_headers = {"Authorization": f"Bearer {tokens['blue_team']}", "X-Bayora-Role": "blue_team"}
        red_headers = {"Authorization": f"Bearer {tokens['red_team']}", "X-Bayora-Role": "red_team"}
        auditor_headers = {"Authorization": f"Bearer {tokens['auditor']}", "X-Bayora-Role": "auditor"}

        # 4. Reject unauthenticated raw header impersonation
        spoof_res = client.get(f"{BASE}/runs", headers={"X-Bayora-Role": "operator"})
        assert spoof_res.status_code == 401
        print("[PASS] Anti-Spoofing: Direct X-Bayora-Role spoofing blocked (HTTP 401)")

        # 5. List initial runs
        runs_res = client.get(f"{BASE}/runs", headers=op_headers)
        assert runs_res.status_code == 200
        initial_runs = runs_res.json()
        print(f"[PASS] List Existing Runs (GET /api/runs): Found {len(initial_runs)} runs")

        # 6. Create a real evaluation run
        create_payload = {
            "suite_id": "bayora-adv-safety-v1",
            "suite_version": "1.0.0",
            "model_id": "mock-deterministic-v1",
            "model_version": "v1",
            "policy_id": "baseline-guard-v1.0",
            "policy_version": "1.0.0",
            "request_budget": 20,
            "timeout_ms": 5000,
        }
        create_res = client.post(f"{BASE}/runs", json=create_payload, headers=op_headers)
        assert create_res.status_code == 201
        run_data = create_res.json()
        run_id = run_data["id"]
        assert run_data["clean_context_enforced"] is True
        print(f"[PASS] Create Run (POST /api/runs): Created {run_id} with clean context enforced")

        # 7. Start the run and execute full lifecycle
        start_res = client.post(f"{BASE}/runs/{run_id}/start", headers=op_headers)
        assert start_res.status_code == 200
        completed_run = start_res.json()
        assert completed_run["status"] == "COMPLETED"
        assert len(completed_run["test_cases"]) == 8
        assert len(completed_run["probes"]) >= 5
        print(f"[PASS] Execute Lifecycle (POST /api/runs/{run_id}/start): Completed 8 test cases and 5 probes")

        # 8. Test RBAC: Sanitize test cases for Blue Team (attack payloads hidden)
        blue_detail = client.get(f"{BASE}/runs/{run_id}", headers=blue_headers).json()
        masked = [tc for tc in blue_detail["test_cases"] if "REDACTED" in tc["prompt"]]
        assert len(masked) > 0
        print("[PASS] RBAC: Blue Team sees attack injection payloads redacted")

        # 9. Verify cryptographic hash chain
        verify_res = client.post(f"{BASE}/runs/{run_id}/verify", headers=auditor_headers)
        assert verify_res.status_code == 200
        vdata = verify_res.json()
        assert vdata["is_valid"] is True
        assert vdata["total_events"] >= 5
        print(f"[PASS] Evidence Integrity (POST /api/runs/{run_id}/verify): 100% Valid ({vdata['total_events']} events)")

        # 10. Run Controlled Tamper Demonstration Drill
        drill_res = client.post(f"{BASE}/runs/{run_id}/tamper-drill?tamper_seq=2", headers=auditor_headers)
        assert drill_res.status_code == 200
        drill = drill_res.json()
        assert drill["tampered"] is True
        assert drill["original_valid"] is True
        assert drill["tampered_valid"] is False
        assert drill["tampered_seq"] == 2
        print(f"[PASS] Controlled Tamper Drill: Detected mutation at #{drill['tampered_seq']} in disposable copy")

        # 11. Confirm original database evidence remains intact
        reverify_res = client.post(f"{BASE}/runs/{run_id}/verify", headers=auditor_headers)
        assert reverify_res.status_code == 200
        assert reverify_res.json()["is_valid"] is True
        print("[PASS] DB Non-Repudiation: Stored database ledger remains 100% unaltered")

        # 12. Run Boundary Probes on demand
        probe_res = client.post(f"{BASE}/probes/execute", headers=op_headers)
        assert probe_res.status_code == 200
        probes = probe_res.json()
        assert len(probes) == 5
        assert all(p["verdict"] == "PASS" for p in probes)
        print("[PASS] On-Demand Boundary Probes (POST /api/probes/execute): 5/5 PASSED")

        # 13. Compare two runs (Run Diff)
        runs_now = client.get(f"{BASE}/runs", headers=op_headers).json()
        assert len(runs_now) >= 2
        diff_res = client.get(f"{BASE}/diff?run_a_id={runs_now[0]['id']}&run_b_id={runs_now[1]['id']}", headers=op_headers)
        assert diff_res.status_code == 200
        diff_data = diff_res.json()
        assert "verdict_changes" in diff_data
        print("[PASS] Run Diff (GET /api/diff): Compared runs side-by-side")

        # 14. Policies: Red Team masked vs Blue Team creation
        red_policies = client.get(f"{BASE}/policies", headers=red_headers).json()
        assert all(p["rules_json"].get("redacted") is True for p in red_policies)
        print("[PASS] Policy Privacy: Red Team cannot inspect Blue policy rules")

        new_policy = {
            "name": "Hardened Defense Guard v2",
            "version": "2.2.0",
            "rules_json": {"blocked_keywords": ["jailbreak", "override"], "block_canary_tokens": True},
            "created_by": "blue_team"
        }
        create_policy_res = client.post(f"{BASE}/policies", json=new_policy, headers=blue_headers)
        assert create_policy_res.status_code == 201
        print("[PASS] Policy Creation (POST /api/policies): Blue Team published new immutable policy")

        # 15. Download executive reports
        rep_json = client.get(f"{BASE}/runs/{run_id}/report?format=json", headers=op_headers)
        assert rep_json.status_code == 200
        assert rep_json.json()["integrity_status"] == "VERIFIED"
        rep_md = client.get(f"{BASE}/runs/{run_id}/report?format=markdown", headers=op_headers)
        assert rep_md.status_code == 200
        assert "# BAYORA Executive Audit Report" in rep_md.text
        print("[PASS] Executive Reports (GET /api/runs/{id}/report): Both JSON and Markdown verified")

    print("\n=== ALL 15 ENDPOINTS AND END-TO-END WORKFLOWS FULLY VERIFIED! ===")

if __name__ == "__main__":
    run_e2e_verification()

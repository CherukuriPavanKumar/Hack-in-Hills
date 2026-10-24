# BAYORA
### Trustworthy Isolation & Evidence Integrity for Adversarial AI Testing

> **Hack in Hills 2026 — Problem Statement 04**  
> **Team CleanSweep:** Cherukuri Pavan Kumar | Chettupalli Jaswanth Kumar | Kolipakula Janakiram  
> **Core Thesis:** *"The problem is not only whether an LLM blocks a harmful prompt. It is whether the testing environment leaks payloads, defences, or state and therefore invalidates the result. Bayora tests the integrity of the AI testing environment itself."*

---

## Architecture Overview

```
                      +----------------------------------------+
                      |         Web Security Console           |
                      |   Next.js App Router + TypeScript      |
                      +-------------------+--------------------+
                                          |
                                          | HTTP (Port 8000)
                                          v
                      +----------------------------------------+
                      |       FastAPI Control Plane            |
                      |   Orchestrator, Auth, Pydantic         |
                      +---+------------------+---------------+--+
                          |                  |               |
             +------------+                  |               +------------+
             | control-net                   | red-net                    | blue-net
             v                               v                            v
  +--------------------+         +--------------------+       +--------------------+
  | PostgreSQL 16      |         | Red Runner Worker  |       | Blue Policy Zone   |
  | Runs, Events, DB   |         | Untrusted Attacker |       | Defense Bundles    |
  | (control-net only) |         | (red-net only)     |       | (blue-net only)    |
  +--------------------+         +---------+----------+       +--------------------+
                                           |
                                           | TCP :8002 (ALLOWED)
                                           v
                             +-----------------------------+
                             |    Enforceable Gateway      |
                             | Allow-lists, Budgets, Rules |
                             |   (red-net + model-net)     |
                             +--------------+--------------+
                                            |
                                            | TCP :8003 (ALLOWED)
                                            v
                             +-----------------------------+
                             |     Target Model Zone       |
                             | Ephemeral Session Isolation |
                             |      (model-net only)       |
                             +-----------------------------+
```

### The 4 Trust Boundaries:
1. **Red Runner cannot reach Blue Policy:** Denied by Docker network namespaces (`red-net` vs `blue-net`).
2. **Red Runner cannot reach Target Model directly:** Direct TCP bypass attempts to `target-model:8003` are unrouted and blocked (`red-net` vs `model-net`).
3. **All Model Access Passes Through Policy Gateway:** The Gateway strictly enforces rate limits, request budgets, and Blue policy regex/canary filters.
4. **Clean Session Context:** Every run receives a freshly generated session ID (`sess_run_*`) with purged context buffers.
5. **Cryptographic SHA-256 Hash Chain:** Every audit event links to the previous digest (`event_hash = SHA256(prev_hash || ':' || canonical_json)`).

---

## Acceptance Test Matrix (T1 – T10)

All 10 acceptance targets defined in the prototype blueprint are covered by automated unit and security tests (`tests/security/test_t1_t10_validation.py`):

| Test | Objective | Method | Result |
|---|---|---|---|
| **T1** | Red → Blue Network Isolation | Harmless TCP socket probe to `blue-policy:8001` from Red container | **0 Unauthorized Accesses (DENIED)** |
| **T2** | Blue → Red Network Isolation | TCP connection probe to `red-runner:8004` from Blue container | **0 Unauthorized Accesses (DENIED)** |
| **T3** | Direct Model Bypass | Red runner attempts direct query to `target-model:8003` | **Blocked; Gateway path works (DENIED)** |
| **T4** | Workspace / Volume Isolation | Red runner attempts to read `/workspace/blue/policy.yaml` | **Read Denied; strictly partitioned volumes** |
| **T5** | Clean Run Context | Run A sets a canary token; Run B queries model about canary | **Run B receives 0 inherited context (PASS)** |
| **T6** | Policy Enforcement | Gateway receives 1 benign and 1 adversarial injection prompt | **Injections blocked; benign allowed (PASS)** |
| **T7** | Ledger Integrity & Tamper Drill | Stored chain verified; disposable copy mutated | **100% stored valid; drill catches tamper** |
| **T8** | Version Traceability | Findings inspected for run ID, model, suite, policy versions | **Full end-to-end lineage verified** |
| **T9** | Resource & Latency Limits | Budget exceeded query sent to gateway; measure p50/p95 | **Enforces budget limit; p50 recorded** |
| **T10** | Failure Handling | Network timeout or model down failure scenario | **Transitions to FAILED without hanging** |

---

## 3-Minute Judging Demo Walkthrough

Follow this sequence for an airtight live judging demonstration (from Page 12 of Blueprint):

1. **[0:00 – 0:20] Overview & Boundary Separation:**
   - Open `http://localhost:3000`.
   - Point to the **Live Isolation Proof Panel**: Show that Red, Blue, Gateway, and Model zones are network-isolated.
   - *"The problem is not only whether an LLM blocks a harmful prompt. It is whether the testing environment leaks payloads, defences, or state and therefore invalidates the result."*

2. **[0:20 – 0:45] Create & Pin a Run:**
   - Click **Create Run**. Select *Bayora Core Safety v1*, *Mock Deterministic v1*, and *Baseline Guard v1.0*.
   - Point out the **Clean Context Enforced** badge. Click **Launch Isolated Evaluation Run**.
   - *"Every result is pinned to an immutable run ID, model version, policy version, and suite hash."*

3. **[0:45 – 1:20] Live Boundary Execution:**
   - In **Live View**, observe the real-time orchestrator state transitions (`VALIDATING → PROVISIONING → ISOLATION_CHECK → RUNNING → EVALUATING → VERIFYING → COMPLETED`).
   - Click **Run Boundary Probes Now** to see live socket probes assert `RED → BLUE: DENIED` and `RED → TARGET DIRECT: DENIED`.
   - *"The UI displays machine-readable probe evidence. Red has no direct route to Blue or to the target; all traffic is mediated by the Gateway."*

4. **[1:20 – 1:55] Adversarial Interceptions & Redaction:**
   - Inspect test cases: Show `CASE-01-DIR-INJ` blocked by Gateway with `POLICY_BLOCKED_KEYWORD`.
   - Switch the header role to **Red Team**: Show that confidential Blue policy rules are masked.
   - Switch to **Blue Team**: Show that hidden attack payloads are protected.

5. **[1:55 – 2:25] Controlled Tamper-Evident Evidence Drill (WOW Moment #2):**
   - Navigate to **Integrity Center**. Click **Verify Stored Chain** (shows 100% green checkmark).
   - Click **Run Controlled Tamper Drill**: The verifier immediately flags a mismatch at sequence #2 in the disposable copy and explains the broken hash.
   - Point to the assurance note: *"The original stored ledger in the database remains 100% untouched."*

6. **[2:25 – 2:50] Run Diff & Reproducibility (WOW Moment #3):**
   - Open **Run Diff**: Compare Run 1 (Baseline Guard) with Run 2 (Hardened Strict).
   - Show how the hardened policy blocked persona jailbreaks and SQL injections without breaking benign queries.

7. **[2:50 – 3:00] Executive Report & Closing:**
   - Open **Reports**, download JSON or Markdown.
   - Close with the core promise: *"Bayora tests the integrity of the AI testing environment itself."*

---

## Quickstart Guide

### Option 1: Docker Compose (Full Multi-Container Setup)
```bash
# Build and launch all 7 isolated services:
docker compose up --build -d

# Open the Web Security Console:
# http://localhost:3000

# Open the API Interactive Docs:
# http://localhost:8000/docs
```

To run the automated boundary probe test inside the live Red Runner container:
```bash
docker compose exec red-runner python3 /app/workers/red_runner/probe.py
```

### Option 2: Local Development
```bash
# 1. Install Python backend dependencies
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2. Configure Environment (.env)
cp .env.example .env
# Edit .env with your keys if testing real frontier models:
# OPENAI_API_KEY=sk-...
# GEMINI_API_KEY=...
# Or set MOCK_MODE_ENABLED=true for offline deterministic testing.

# 3. Install Web frontend dependencies
cd apps/web && npm install && cd ../..

# 4. Run automated tests
pytest -v tests/           # All 71 backend security, unit, provider & integration tests
cd apps/web && npm test    # All 17 frontend logic & routing tests

# 5. Launch local development servers (Backend: 8000, Frontend: 3000)
# Linux / macOS:
./scripts/dev.sh

# Windows PowerShell:
powershell -ExecutionPolicy Bypass ./scripts/dev.ps1
```

---

## Model Providers & Inference Architecture (Phase 1)

BAYORA includes a typed, provider-agnostic inference layer (`services/providers/`):

- **OpenAI-Compatible Chat Completions:** Native support for `gpt-4o`, `gpt-4o-mini`, `o3-mini`, self-hosted vLLM, and local Ollama (`http://localhost:11434/v1`).
- **Google Gemini:** Native async support for `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro` with safety block normalization.
- **Deterministic Mock Simulator:** High-speed offline mock provider for local development, CI/CD, and regression testing without cloud costs.
- **SSRF Hardening:** Strict server-side IP address and DNS inspection (`services/providers/ssrf.py`) blocking loopback (127.0.0.0/8), RFC1918 private subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), and cloud metadata endpoints (169.254.169.254).
- **Truthful Evaluator (`bayora-eval-v2.0`):** Replaces naive substring scoring with an evidence-based evaluation engine distinguishing gateway policy enforcement, model safety refusals, credential leaks, prompt injections, and provider infrastructure errors (`INCONCLUSIVE`).
- **Cryptographic Hash Chain:** Audit events record full input/output token metrics, provider identity, finish reasons, and execution metadata without leaking API secrets.

---

## Repository Structure

```
.
├── apps/
│   ├── api/                    # FastAPI control plane, routes, models, schemas, auth
│   └── web/                    # TanStack Start / Vite, React 19, Tailwind CSS, security console UI
├── services/
│   ├── gateway/                # Policy Gateway mediation & request budgeting
│   ├── target_model/           # Deterministic Mock Target Adapter & session isolation
│   └── evaluator/              # Deterministic rule-based evaluation engine
├── workers/
│   ├── red_runner/             # Fixed benchmark suites & boundary probe script
│   └── blue_policy/            # Versioned defense policy bundles & compiler
├── tests/
│   ├── security/               # T1-T10 acceptance tests & auth impersonation tests
│   ├── unit/                   # SHA-256 hash chain & tamper tests
│   ├── test_api_and_isolation.py # End-to-end API integration tests
│   └── test_api_contract_complete.py # Complete 15-endpoint API contract validation
├── docs/
│   ├── threat_model.md         # STRIDE / OWASP LLM boundary analysis
│   ├── api_contract.md         # Endpoint contract & schemas
│   └── known_limitations.md    # Transparent security boundary disclosure
├── docker-compose.yml          # 4 explicit bridge networks, 0 docker.sock
└── scripts/
    ├── dev.sh                  # Local launch script (Linux/macOS)
    ├── dev.ps1                 # Local launch script (Windows PowerShell)
    ├── test.sh                 # Test runner script
    ├── run_docker.sh           # Docker build & boundary verification
    └── verify_e2e_live.py      # End-to-end live API verification script
```

---

## Technology Stack

- **Frontend:** TanStack Start, Vite, React 19, TypeScript, Tailwind CSS, Radix UI, Lucide Icons.
- **Backend:** Python 3.11 / 3.14+, FastAPI, Pydantic v2, SQLAlchemy.
- **Database:** PostgreSQL 16 (with SQLite local fallback).
- **Integrity:** SHA-256 Canonical JSON Hash-Chained Audit Ledger.
- **Isolation:** Docker Compose with 4 named networks (`control-net`, `red-net`, `blue-net`, `model-net`).
- **Testing:** Pytest (71 backend tests across security, provider contracts, truthful evaluation, unit, and integration suites), Vitest (17 frontend tests), TypeScript type check (0 errors), ESLint (0 errors).

---

## License & Credits

Built for **Hack in Hills 2026**, Problem Statement 04 (*Trustworthy isolation for adversarial AI testing*).  
Authored by **Team CleanSweep** (Cherukuri Pavan Kumar, Chettupalli Jaswanth Kumar, Kolipakula Janakiram).

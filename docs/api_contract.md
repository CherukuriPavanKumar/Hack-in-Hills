# BAYORA — Control Plane API Specification

Base URL: `http://localhost:8000/api`  
Interactive OpenAPI Documentation: `http://localhost:8000/docs`

---

## Headers & Authorization

| Header | Values | Purpose |
|---|---|---|
| `X-Bayora-Role` | `operator`, `red_team`, `blue_team`, `auditor` | Server-side role enforcement and response sanitization |

- **`operator`**: Full unrestricted access.
- **`red_team`**: Blue defense rules JSON masked.
- **`blue_team`**: Hidden attack injection strings masked in advance.
- **`auditor`**: Canary tokens masked.

---

## Core Endpoints

### 1. Runs Lifecycle
- `POST /api/runs`: Validate and freeze configuration; returns newly allocated run record.
- `POST /api/runs/{run_id}/start`: Executes lifecycle transitions:
  `CREATED → VALIDATING → PROVISIONING → ISOLATION_CHECK → RUNNING → EVALUATING → VERIFYING → COMPLETED`
- `GET /api/runs`: List recent runs with score summaries and statuses.
- `GET /api/runs/{run_id}`: Read run detail, boundary probes, and test case results.
- `GET /api/runs/{run_id}/events`: Retrieve ordered SHA-256 hash-chained audit events.
- `POST /api/runs/{run_id}/verify`: Independently recomputes hash chain and returns verification status.
- `POST /api/runs/{run_id}/tamper-drill`: Controlled tamper demonstration on an in-memory disposable copy.
- `GET /api/runs/{run_id}/report?format=json|markdown`: Generates executive findings report.

### 2. Defense Policies
- `GET /api/policies`: List versioned defense policies (role-sanitized).
- `POST /api/policies`: Compile and commit a new versioned defense policy.

### 3. Boundary Probes & Diff
- `POST /api/probes/execute`: Execute live machine-level TCP socket probe matrix.
- `GET /api/diff?run_a_id={id}&run_b_id={id}`: Compare two evaluation runs side-by-side.
- `GET /api/topology`: Read system network isolation zones and routing rules.
- `GET /api/health`: Health status.

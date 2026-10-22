# BAYORA — Threat Model & Security Boundaries

## 1. Problem Statement & Scope

In a shared Docker or cloud testing sandbox, adversarial red teams, defensive blue teams, and target Large Language Models (LLMs) often run within the same network or host. Without strict isolation:
- **Red Team Contamination:** Attackers can discover private defensive rules, modify logging mechanisms, or probe model memory directly.
- **Context Pollution:** Residual chat history, canary secrets, or cache artifacts from earlier runs corrupt subsequent test results.
- **Direct Model Bypass:** Attackers bypass defensive gateways by connecting directly to target inference sockets.
- **Audit Tampering:** Attack findings and metrics can be silently altered after the run without detection.

---

## 2. Trust Zones & Boundaries

| Zone | Network | Inbound Access | Outbound Access | Trust Level |
|---|---|---|---|---|
| **Red Runner Zone** | `red-net` | None | `gateway:8002` only | Untrusted |
| **Blue Policy Zone** | `blue-net` | `api` only | Control plane only | Trusted (Confidential) |
| **Policy Gateway** | `red-net` + `model-net` | `red-runner:8002` | `target-model:8003` | Enforcing Boundary |
| **Target Model Zone** | `model-net` | `gateway:8003` only | None | Isolated Subject |
| **Control Plane & DB** | `control-net` | Web UI / Admin | All internal zones | Trusted Coordinator |

---

## 3. Threat Matrix & Enforced Mitigations

### T1: Cross-Team Workspace Snooping (Red ↔ Blue)
- **Threat:** Red runner attempts to inspect Blue team's regex filters or secret defense bundles.
- **Enforcement:** Blue policy files are stored on isolated volumes; `blue-policy` listens strictly on `blue-net`. Red runner on `red-net` cannot resolve or reach Blue IP addresses (asserted via Probe `T1_RED_TO_BLUE_NETWORK`).

### T2: Direct Target Model Bypass
- **Threat:** Red runner attempts to query target model port `8003` directly, evading the defense policy.
- **Enforcement:** `target-model` container is attached ONLY to `model-net`. Red runner is attached ONLY to `red-net`. Direct TCP packets are unrouted and dropped (asserted via Probe `T3_DIRECT_MODEL_BYPASS`).

### T3: State & Context Inheritance (Canary Leakage)
- **Threat:** Run B inherits context, internal prompts, or canary strings from Run A.
- **Enforcement:** The orchestrator generates a cryptographically fresh `session_id` per run (`sess_run_*`). Target adapter purges and isolates memory buffers per session. Canary tokens are never carried across run boundaries (asserted via `test_t5_clean_run_context`).

### T4: Post-Hoc Audit Event Tampering
- **Threat:** An adversary edits an evaluation finding in the database to conceal an exploit.
- **Enforcement:** All audit events form a canonical SHA-256 hash chain:
  `event_hash = SHA256(prev_hash || ':' || canonical_json(event))`
  Any single-byte modification invalidates all downstream hashes and is caught by the independent verifier (asserted via `test_tamper_drill_detects_mutation`).

---

## 4. Stated Limitations & Residual Risks

1. **Shared Host Kernel:** Docker containers share the host kernel. Hardened multi-tenant production deployments should adopt lightweight microVM hypervisors (e.g., AWS Firecracker, Kata Containers, or gVisor).
2. **Hardware Side-Channels:** Container namespaces do not protect against speculative execution CPU cache attacks (Spectre/Meltdown) without dedicated core pinning.
3. **External Head Anchoring:** While the SHA-256 chain is tamper-evident against local tampering, enterprise non-repudiation requires periodically anchoring head block digests to an external HSM or immutable cloud ledger.

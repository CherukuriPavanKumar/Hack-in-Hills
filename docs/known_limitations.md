# BAYORA — Known Limitations & Honest Security Stance

Per the Bayora Prototype Blueprint (Page 7 & 14):
> *"Words that protect your credibility: Say 'we validated the listed boundary tests in our prototype' only after you run them. Do not say 'unhackable', 'zero leakage guaranteed', or 'production-grade isolation' based on a Docker Compose demo."*

---

## 1. Validated Claims in this Prototype

1. **Explicit Docker Network Segmentation:**
   Containers communicate only across explicitly connected Docker networks. Probes verify that Red runner on `red-net` cannot establish TCP connections to `blue-policy:8001` or `target-model:8003`.
2. **Policy Gateway Enforcement:**
   Direct model bypass attempts fail. All model queries pass through the Gateway where rate limits, request budgets, and Blue policies are enforced.
3. **Clean Session Context:**
   Each evaluation run is assigned a fresh ephemeral session ID (`sess_run_*`). Target adapter buffers are strictly isolated, preventing memory or canary token inheritance.
4. **Audit Chain Tamper Detection:**
   The event ledger is linked via canonical SHA-256 hashes starting from a defined Genesis hash. Any mutation in event metadata or sequence breaks downstream hashes and is caught by independent verification.

---

## 2. Realistic Production Limitations (Residual Risks)

| Limitation | Technical Reason | Production Hardening Path |
|---|---|---|
| **Shared Linux Kernel** | Container namespaces share kernel syscall entrypoints. A kernel 0-day could escape container isolation. | MicroVM hypervisors (AWS Firecracker, Kata Containers, gVisor). |
| **CPU Cache Side-Channels** | Multi-tenant hardware shares CPU caches and branch predictors (Spectre/Meltdown variants). | Dedicated tenant hardware instances with CPU core pinning. |
| **Local Hash Ledger Anchoring** | An attacker with host root privileges could rewrite the entire SQLite/Postgres database and recalculate all hashes. | Periodic checkpoint anchoring to an external HSM, cloud ledger (e.g. AWS QLDB/Sigstore), or append-only WORM storage. |
| **Hosted LLM Indeterminism** | When connecting to third-party proprietary LLM APIs rather than deterministic mock profiles, floating-point concurrency may cause minor textual non-determinism across runs. | Pin `temperature: 0.0`, `seed: 42`, and capture full response hashes. |

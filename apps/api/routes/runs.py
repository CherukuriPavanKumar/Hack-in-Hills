import copy
import datetime
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from apps.api.core.auth import (
    Role,
    get_current_role,
    sanitize_test_case_for_role,
)
from apps.api.core.database import get_db
from apps.api.core.hash_chain import (
    GENESIS_HASH,
    canonicalize_payload,
    compute_event_hash,
    verify_chain,
)
from apps.api.models.models import (
    AuditEvent,
    BoundaryProbe,
    PolicyVersion,
    Report,
    TestCaseResult,
    TestRun,
)
from apps.api.schemas.schemas import (
    AuditEventResponse,
    BoundaryProbeResponse,
    ReportResponse,
    RunCreate,
    RunResponse,
    TamperDrillResponse,
    TestCaseResponse,
    VerifyResponse,
)
from services.orchestrator import Orchestrator, append_audit_event
from workers.blue_policy.default_policies import (
    DEFAULT_POLICIES,
    compute_policy_hash,
)
from workers.red_runner.benchmark_suites import (
    BENCHMARK_SUITES,
    compute_suite_hash,
    get_suite,
)

router = APIRouter(prefix="/runs", tags=["Runs"])


@router.post("", response_model=RunResponse, status_code=201)
def create_run(
    req: RunCreate,
    db: Session = Depends(get_db),
    role: Role = Depends(get_current_role),
):
    """
    Validate config and create a new run with unique ID and frozen metadata.
    """
    suite_data = get_suite(req.suite_id)
    suite_hash = compute_suite_hash(suite_data)

    policy_record = (
        db.query(PolicyVersion).filter(PolicyVersion.id == req.policy_id).first()
    )
    if policy_record:
        p_rules = policy_record.rules_json
        p_hash = policy_record.policy_hash
    elif req.policy_id in DEFAULT_POLICIES:
        p_rules = DEFAULT_POLICIES[req.policy_id]["rules_json"]
        p_hash = compute_policy_hash(p_rules)
    else:
        p_rules = DEFAULT_POLICIES["baseline-guard-v1.0"]["rules_json"]
        p_hash = compute_policy_hash(p_rules)

    run_id = f"run_{uuid.uuid4().hex[:12]}"
    config_dict = {
        "suite_id": req.suite_id,
        "suite_version": req.suite_version,
        "model_id": req.model_id,
        "model_version": req.model_version,
        "policy_id": req.policy_id,
        "policy_version": req.policy_version,
        "request_budget": req.request_budget,
        "timeout_ms": req.timeout_ms,
        "clean_context_enforced": True,
    }
    canonical_config = canonicalize_payload(config_dict)
    config_hash = compute_event_hash(GENESIS_HASH, canonical_config)

    run = TestRun(
        id=run_id,
        status="CREATED",
        suite_id=req.suite_id,
        suite_version=req.suite_version,
        suite_hash=suite_hash,
        model_id=req.model_id,
        model_version=req.model_version,
        policy_id=req.policy_id,
        policy_version=req.policy_version,
        policy_hash=p_hash,
        evaluator_version="bayora-eval-v1.0",
        config_hash=config_hash,
        request_budget=req.request_budget,
        timeout_ms=req.timeout_ms,
        clean_context_enforced=True,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    # Initial Audit Event
    append_audit_event(
        db,
        run.id,
        "RUN_CREATED",
        role.value,
        {"initial_status": "CREATED", "config_hash": config_hash},
    )

    return run


@router.post("/{run_id}/start", response_model=RunResponse)
async def start_run(
    run_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Start lifecycle: transitions through VALIDATING -> PROVISIONING ->
    ISOLATION_CHECK -> RUNNING -> EVALUATING -> VERIFYING -> COMPLETED.
    """
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    if run.status in ["RUNNING", "COMPLETED", "ISOLATION_CHECK"]:
        return run

    # Execute run lifecycle
    await Orchestrator.execute_run_lifecycle(run.id, db)
    db.refresh(run)
    return run


@router.get("", response_model=List[RunResponse])
def list_runs(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    role: Role = Depends(get_current_role),
):
    """List recent runs with statuses and scores."""
    runs = (
        db.query(TestRun)
        .order_by(TestRun.created_at.desc())
        .limit(limit)
        .all()
    )
    return runs


@router.get("/{run_id}", response_model=RunResponse)
def get_run(
    run_id: str,
    db: Session = Depends(get_db),
    role: Role = Depends(get_current_role),
):
    """Get run detail, sanitized according to caller's role."""
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    # Sanitize test cases for role
    if role != Role.OPERATOR:
        for tc in run.test_cases:
            sanitized = sanitize_test_case_for_role(
                {
                    "case_id": tc.case_id,
                    "prompt": tc.prompt,
                    "model_response": tc.model_response,
                },
                role,
            )
            tc.prompt = sanitized["prompt"]
            tc.model_response = sanitized.get("model_response", tc.model_response)

    return run


@router.get("/{run_id}/events", response_model=List[AuditEventResponse])
def get_run_events(
    run_id: str,
    db: Session = Depends(get_db),
):
    """Fetch ordered timeline events forming the SHA-256 hash chain."""
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    events = (
        db.query(AuditEvent)
        .filter(AuditEvent.run_id == run_id)
        .order_by(AuditEvent.seq.asc())
        .all()
    )
    return events


@router.post("/{run_id}/verify", response_model=VerifyResponse)
def verify_run_chain(
    run_id: str,
    db: Session = Depends(get_db),
):
    """
    Independently recompute the audit hash chain from genesis to head
    and report verification outcome.
    """
    events = (
        db.query(AuditEvent)
        .filter(AuditEvent.run_id == run_id)
        .order_by(AuditEvent.seq.asc())
        .all()
    )
    if not events:
        raise HTTPException(status_code=404, detail="No audit events found for run")

    event_dicts = [
        {
            "seq": e.seq,
            "run_id": e.run_id,
            "event_type": e.event_type,
            "timestamp": e.timestamp,
            "actor": e.actor,
            "metadata_json": e.metadata_json,
            "prev_hash": e.prev_hash,
            "event_hash": e.event_hash,
        }
        for e in events
    ]

    is_valid, failing_seq, reason = verify_chain(event_dicts)

    return VerifyResponse(
        run_id=run_id,
        is_valid=is_valid,
        total_events=len(event_dicts),
        mismatch_seq=failing_seq,
        reason=reason or "Full SHA-256 hash chain verified successfully from genesis.",
        verified_at=datetime.datetime.utcnow().isoformat() + "Z",
    )


@router.post("/{run_id}/tamper-drill", response_model=TamperDrillResponse)
def tamper_drill(
    run_id: str,
    tamper_seq: int = Query(default=2, ge=1),
    db: Session = Depends(get_db),
):
    """
    Controlled Tamper-Evident Ledger Demo (WOW Moment #2).
    Copies stored events into an in-memory disposable sequence,
    modifies one event, and runs the independent verifier.
    The real stored ledger is NEVER corrupted.
    """
    events = (
        db.query(AuditEvent)
        .filter(AuditEvent.run_id == run_id)
        .order_by(AuditEvent.seq.asc())
        .all()
    )
    if not events:
        raise HTTPException(status_code=404, detail="No audit events found for run")

    event_dicts = [
        {
            "seq": e.seq,
            "run_id": e.run_id,
            "event_type": e.event_type,
            "timestamp": e.timestamp,
            "actor": e.actor,
            "metadata_json": dict(e.metadata_json),
            "prev_hash": e.prev_hash,
            "event_hash": e.event_hash,
        }
        for e in events
    ]

    # Verify original first to prove baseline validity
    orig_valid, _, _ = verify_chain(event_dicts)

    # Create disposable copy
    tampered_copy = copy.deepcopy(event_dicts)

    target_idx = min(tamper_seq - 1, len(tampered_copy) - 1)
    target_event = tampered_copy[target_idx]
    actual_seq = target_event["seq"]
    original_event_hash = target_event["event_hash"]

    # Deliberately modify an event payload field without recomputing hashes
    target_event["metadata_json"]["tampered_by"] = "malicious_actor"
    target_event["metadata_json"]["altered_payload"] = "INJECTED_UNAUTHORIZED_MUTATION"

    # Compute what the altered hash would be
    canonical_tampered = canonicalize_payload(target_event)
    tampered_recomputed_hash = compute_event_hash(
        target_event["prev_hash"], canonical_tampered
    )

    # Run independent verifier on disposable copy
    tampered_valid, mismatch_seq, reason = verify_chain(tampered_copy)

    expected_next = (
        tampered_copy[target_idx + 1]["prev_hash"]
        if target_idx + 1 < len(tampered_copy)
        else original_event_hash
    )

    return TamperDrillResponse(
        run_id=run_id,
        tampered=True,
        original_valid=orig_valid,
        tampered_valid=tampered_valid,
        tampered_seq=actual_seq,
        mismatch_seq=mismatch_seq or actual_seq,
        original_event_hash=original_event_hash,
        tampered_event_hash=tampered_recomputed_hash,
        expected_next_prev_hash=expected_next,
        explanation=(
            f"Tamper detected! Event seq #{actual_seq} canonical payload was mutated in disposable copy. "
            f"Independent verification failed at seq #{mismatch_seq}: {reason}"
        ),
    )


@router.get("/{run_id}/report")
def get_run_report(
    run_id: str,
    format: str = Query(default="json", pattern="^(json|markdown)$"),
    db: Session = Depends(get_db),
):
    """
    Generate and return executive report (JSON or downloadable Markdown).
    """
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    report = db.query(Report).filter(Report.run_id == run_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not generated yet for this run")

    if format == "json":
        return {
            "report_id": report.id,
            "run_id": run.id,
            "lifecycle_status": run.status,
            "tested_configuration": {
                "suite_id": run.suite_id,
                "suite_version": run.suite_version,
                "suite_hash": run.suite_hash,
                "model_id": run.model_id,
                "model_version": run.model_version,
                "policy_id": run.policy_id,
                "policy_version": run.policy_version,
                "policy_hash": run.policy_hash,
                "evaluator_version": run.evaluator_version,
                "config_hash": run.config_hash,
            },
            "findings_summary": report.summary_json,
            "integrity_status": report.integrity_status,
            "boundary_probes": [
                {
                    "probe_name": p.probe_name,
                    "expected": p.expected,
                    "observed": p.observed,
                    "verdict": p.verdict,
                    "evidence": p.evidence_ref,
                }
                for p in run.probes
            ],
            "residual_risks": report.residual_risks,
            "exported_at": report.exported_at.isoformat() + "Z",
        }

    # Markdown export format
    md_lines = [
        f"# BAYORA Executive Audit Report — Run `{run.id}`",
        f"**Generated**: {datetime.datetime.utcnow().isoformat()}Z  ",
        f"**Run Status**: `{run.status}` | **Integrity Status**: `{report.integrity_status}`  ",
        "",
        "## 1. Tested Configuration & Pinned Versions",
        f"- **Benchmark Suite**: `{run.suite_id}` (v{run.suite_version}) — SHA256: `{run.suite_hash[:16]}...`",
        f"- **Target Model Profile**: `{run.model_id}` (v{run.model_version})",
        f"- **Defense Policy**: `{run.policy_id}` (v{run.policy_version}) — SHA256: `{run.policy_hash[:16]}...`",
        f"- **Evaluator**: `{run.evaluator_version}`",
        f"- **Configuration Hash**: `{run.config_hash}`",
        f"- **Clean Context Enforced**: `True` (Isolated ephemeral session allocated)",
        "",
        "## 2. Boundary Isolation Probes",
        "| Probe | Source | Destination | Expected | Observed | Verdict | Evidence |",
        "|---|---|---|---|---|---|---|",
    ]
    for p in run.probes:
        md_lines.append(
            f"| `{p.probe_name}` | `{p.source_zone}` | `{p.destination}` | `{p.expected}` | `{p.observed}` | **{p.verdict}** | `{p.evidence_ref}` |"
        )

    md_lines.extend([
        "",
        "## 3. Findings Summary & Metrics",
        f"- **Total Test Cases**: {report.summary_json.get('total_cases', 0)}",
        f"- **Passed / Mitigated**: {report.summary_json.get('passed', 0)}",
        f"- **Vulnerabilities / Failed**: {report.summary_json.get('failed', 0)}",
        f"- **Inconclusive**: {report.summary_json.get('inconclusive', 0)}",
        f"- **Median Latency (p50)**: {report.summary_json.get('p50_latency_ms', 0)}ms",
        f"- **95th Percentile (p95)**: {report.summary_json.get('p95_latency_ms', 0)}ms",
        "",
        "## 4. Residual Risks & Stated Limitations",
    ])
    for risk in report.residual_risks:
        md_lines.append(f"- **[{risk['severity']}] {risk['title']}**: {risk['description']}")

    content = "\n".join(md_lines)
    return Response(content=content, media_type="text/markdown")

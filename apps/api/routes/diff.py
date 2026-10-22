from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from apps.api.core.auth import Role, get_current_role
from apps.api.core.database import get_db
from apps.api.models.models import TestRun
from apps.api.schemas.schemas import RunDiffResponse

router = APIRouter(prefix="/diff", tags=["Run Diff"])


@router.get("", response_model=RunDiffResponse)
def compare_runs(
    run_a_id: str = Query(..., description="First run ID"),
    run_b_id: str = Query(..., description="Second run ID"),
    db: Session = Depends(get_db),
    role: Role = Depends(get_current_role),
):
    """
    Compare two runs side-by-side to demonstrate reproducibility and
    the empirical impact of defense policies or model profiles.
    """
    run_a = db.query(TestRun).filter(TestRun.id == run_a_id).first()
    run_b = db.query(TestRun).filter(TestRun.id == run_b_id).first()

    if not run_a or not run_b:
        raise HTTPException(status_code=404, detail="One or both runs not found")

    cases_a_map = {tc.case_id: tc for tc in run_a.test_cases}
    cases_b_map = {tc.case_id: tc for tc in run_b.test_cases}

    all_case_ids = sorted(list(set(cases_a_map.keys()) | set(cases_b_map.keys())))

    verdict_changes = []
    for cid in all_case_ids:
        ca = cases_a_map.get(cid)
        cb = cases_b_map.get(cid)
        verdict_a = ca.verdict if ca else "N/A"
        verdict_b = cb.verdict if cb else "N/A"
        category = ca.category if ca else cb.category if cb else "UNKNOWN"

        verdict_changes.append({
            "case_id": cid,
            "category": category,
            "run_a_verdict": verdict_a,
            "run_b_verdict": verdict_b,
            "changed": verdict_a != verdict_b,
            "run_a_gateway_decision": ca.gateway_decision if ca else "N/A",
            "run_b_gateway_decision": cb.gateway_decision if cb else "N/A",
        })

    lat_comp = {
        "run_a_p50_ms": run_a.score_summary.get("p50_latency_ms", 0),
        "run_b_p50_ms": run_b.score_summary.get("p50_latency_ms", 0),
        "run_a_p95_ms": run_a.score_summary.get("p95_latency_ms", 0),
        "run_b_p95_ms": run_b.score_summary.get("p95_latency_ms", 0),
    }

    return RunDiffResponse(
        run_a_id=run_a.id,
        run_b_id=run_b.id,
        run_a_policy=f"{run_a.policy_id} (v{run_a.policy_version})",
        run_b_policy=f"{run_b.policy_id} (v{run_b.policy_version})",
        run_a_model=f"{run_a.model_id} (v{run_a.model_version})",
        run_b_model=f"{run_b.model_id} (v{run_b.model_version})",
        run_a_summary=run_a.score_summary,
        run_b_summary=run_b.score_summary,
        verdict_changes=verdict_changes,
        latency_comparison=lat_comp,
    )

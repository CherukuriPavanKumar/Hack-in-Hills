import os
from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from apps.api.core.auth import Role, get_current_role
from services.boundary_checker import BoundaryChecker

router = APIRouter(prefix="/probes", tags=["Boundary Probes"])


@router.post("/execute", response_model=List[Dict[str, Any]])
def execute_probes_now(role: Role = Depends(get_current_role)):
    """
    On-demand execution of the real boundary probe matrix.
    Powers the Live Isolation Proof Panel.
    Returns real socket error codes and verified isolation status.
    Requires authenticated session token.
    """
    is_in_docker = bool(os.getenv("RUNNING_IN_DOCKER", False))
    results = BoundaryChecker.execute_probe_matrix(in_docker=is_in_docker)
    return results


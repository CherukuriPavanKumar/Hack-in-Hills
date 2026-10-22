import datetime
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from apps.api.core.auth import (
    Role,
    get_current_role,
    sanitize_policy_for_role,
)
from apps.api.core.database import get_db
from apps.api.models.models import PolicyVersion
from apps.api.schemas.schemas import PolicyCreate, PolicyResponse
from workers.blue_policy.default_policies import (
    DEFAULT_POLICIES,
    compute_policy_hash,
)

router = APIRouter(prefix="/policies", tags=["Policies"])


@router.get("", response_model=List[PolicyResponse])
def list_policies(
    db: Session = Depends(get_db),
    role: Role = Depends(get_current_role),
):
    """
    List all versioned defense policies.
    If caller is Red Team, internal rules logic is sanitized/redacted.
    """
    # Seed default policies in DB if not present
    for p_id, p_data in DEFAULT_POLICIES.items():
        existing = db.query(PolicyVersion).filter(PolicyVersion.id == p_id).first()
        if not existing:
            p_hash = compute_policy_hash(p_data["rules_json"])
            new_p = PolicyVersion(
                id=p_id,
                name=p_data["name"],
                version=p_data["version"],
                rules_json=p_data["rules_json"],
                created_by=p_data["created_by"],
                policy_hash=p_hash,
            )
            db.add(new_p)
    db.commit()

    policies = db.query(PolicyVersion).order_by(PolicyVersion.created_at.desc()).all()
    result = []
    for p in policies:
        p_dict = {
            "id": p.id,
            "name": p.name,
            "version": p.version,
            "rules_json": p.rules_json,
            "created_by": p.created_by,
            "created_at": p.created_at,
            "policy_hash": p.policy_hash,
        }
        sanitized = sanitize_policy_for_role(p_dict, role)
        result.append(sanitized)
    return result


@router.post("", response_model=PolicyResponse, status_code=201)
def create_policy(
    req: PolicyCreate,
    db: Session = Depends(get_db),
    role: Role = Depends(get_current_role),
):
    """
    Submit and validate a new immutable versioned defense policy.
    """
    if role == Role.RED_TEAM:
        raise HTTPException(
            status_code=403,
            detail="Red Team members are forbidden from authoring Blue Team defense policies.",
        )

    policy_id = f"policy_{uuid.uuid4().hex[:8]}"
    p_hash = compute_policy_hash(req.rules_json)

    new_policy = PolicyVersion(
        id=policy_id,
        name=req.name,
        version=req.version,
        rules_json=req.rules_json,
        created_by=req.created_by or role.value,
        created_at=datetime.datetime.utcnow(),
        policy_hash=p_hash,
    )
    db.add(new_policy)
    db.commit()
    db.refresh(new_policy)
    return new_policy

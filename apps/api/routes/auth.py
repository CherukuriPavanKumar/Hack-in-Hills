from __future__ import annotations

import time
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from apps.api.core.auth import Role, create_signed_token, get_current_role
from apps.api.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])


class TokenRequest(BaseModel):
    role: Role = Field(default=Role.OPERATOR, description="Requested session role (operator, blue_team, red_team, auditor)")
    user_id: Optional[str] = Field(default=None, description="Optional user identifier")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    expires_in: int
    expires_at: int


@router.post("/token", response_model=TokenResponse)
def issue_session_token(
    req: TokenRequest,
    x_bayora_master_key: Optional[str] = Header(None, alias="X-Bayora-Master-Key"),
):
    """
    Issue a tamper-evident, cryptographically signed session token for the specified role.
    In production (or when ALLOW_DEMO_TOKEN_ROLE_SELECTION=False), self-selected privileged
    role minting is forbidden without a verified master administrative key.
    """
    is_production = settings.APP_ENV.lower() == "production" or not settings.ALLOW_DEMO_TOKEN_ROLE_SELECTION
    if is_production and req.role in (Role.OPERATOR, Role.RED_TEAM):
        if not settings.OPERATOR_MASTER_SECRET:
            raise HTTPException(
                status_code=403,
                detail="Privileged role token minting is disabled in production without OPERATOR_MASTER_SECRET.",
            )
        if not x_bayora_master_key or x_bayora_master_key != settings.OPERATOR_MASTER_SECRET:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Privileged role token minting requires valid 'X-Bayora-Master-Key' header in production.",
            )

    token = create_signed_token(role=req.role, user_id=req.user_id)
    now = int(time.time())
    exp = now + settings.TOKEN_EXPIRY_SECONDS
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=req.role.value,
        expires_in=settings.TOKEN_EXPIRY_SECONDS,
        expires_at=exp,
    )


@router.get("/me")
def get_authenticated_session(role: Role = Depends(get_current_role)):
    """
    Verify the active session token and return verified role and permissions.
    """
    permissions = {
        Role.OPERATOR: ["all_access", "create_runs", "start_runs", "create_policies", "view_unredacted_evidence"],
        Role.BLUE_TEAM: ["create_policies", "view_policies", "view_runs_redacted_prompts"],
        Role.RED_TEAM: ["create_runs", "start_runs", "view_runs", "redacted_blue_policies"],
        Role.AUDITOR: ["view_runs", "verify_chains", "tamper_drill", "masked_canary_tokens"],
    }
    return {
        "authenticated": True,
        "verified_role": role.value,
        "permissions": permissions.get(role, []),
    }

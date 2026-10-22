from __future__ import annotations

import time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
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
def issue_session_token(req: TokenRequest):
    """
    Issue a tamper-evident, cryptographically signed session token for the specified role.
    Replaces vulnerable direct header spoofing with verifiable HMAC-SHA256 signatures.
    """
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

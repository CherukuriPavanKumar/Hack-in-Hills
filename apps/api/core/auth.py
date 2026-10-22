from __future__ import annotations

import base64
from enum import Enum
import hashlib
import hmac
import json
import time
from typing import Any, Callable, Dict, List, Optional
from fastapi import Depends, Header, HTTPException

from apps.api.core.config import settings


class Role(str, Enum):
    OPERATOR = "operator"
    RED_TEAM = "red_team"
    BLUE_TEAM = "blue_team"
    AUDITOR = "auditor"


def create_signed_token(
    role: Role,
    user_id: Optional[str] = None,
    expires_in: Optional[int] = None,
) -> str:
    """
    Generate a tamper-evident, cryptographically signed session token
    anchored to the server's AUTH_SECRET_KEY using HMAC-SHA256.
    """
    now = int(time.time())
    exp = now + (expires_in if expires_in is not None else settings.TOKEN_EXPIRY_SECONDS)
    payload = {
        "role": role.value,
        "sub": user_id or f"user_{role.value}",
        "iat": now,
        "exp": exp,
    }
    payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("utf-8").rstrip("=")

    secret = settings.AUTH_SECRET_KEY.encode("utf-8")
    signature = hmac.new(secret, payload_b64.encode("utf-8"), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode("utf-8").rstrip("=")

    return f"{payload_b64}.{sig_b64}"


def verify_signed_token(token: str) -> Dict[str, Any]:
    """
    Cryptographically verify HMAC-SHA256 signature and expiration of session token.
    Raises HTTPException(401) on any signature mismatch, malformation, or expiry.
    """
    if not token or not isinstance(token, str):
        raise HTTPException(status_code=401, detail="Authentication token missing or invalid format.")

    parts = token.strip().split(".")
    if len(parts) != 2:
        raise HTTPException(status_code=401, detail="Malformed authentication token structure.")

    payload_b64, sig_b64 = parts
    secret = settings.AUTH_SECRET_KEY.encode("utf-8")
    expected_sig = hmac.new(secret, payload_b64.encode("utf-8"), hashlib.sha256).digest()
    expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode("utf-8").rstrip("=")

    if not hmac.compare_digest(sig_b64, expected_sig_b64):
        raise HTTPException(
            status_code=401,
            detail="Cryptographic token signature mismatch. Role impersonation blocked.",
        )

    # Decode payload
    padded = payload_b64 + "=" * (-len(payload_b64) % 4)
    try:
        payload_bytes = base64.urlsafe_b64decode(padded)
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=401, detail="Corrupted token payload encoding.")

    # Expiry verification
    now = int(time.time())
    if payload.get("exp", 0) < now:
        raise HTTPException(status_code=401, detail="Session token has expired. Re-authenticate.")

    return payload


def get_current_role(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_bayora_role: Optional[str] = Header(None, alias="X-Bayora-Role"),
) -> Role:
    """
    Verify identity and role using backend-signed tokens.
    Rejects any unauthenticated role spoofing via raw 'X-Bayora-Role' header.
    """
    # 1. Reject raw header spoofing without valid bearer token
    if x_bayora_role and not authorization:
        raise HTTPException(
            status_code=401,
            detail=(
                f"Unauthorized: Direct role spoofing via 'X-Bayora-Role: {x_bayora_role}' is forbidden. "
                "All requests must include a backend-signed 'Authorization: Bearer <token>' from /api/auth/token."
            ),
        )

    # 2. Require Authorization Bearer header
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please provide a valid 'Authorization: Bearer <token>' header.",
        )

    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization format. Must be 'Bearer <signed_token>'.",
        )

    token = parts[1]
    payload = verify_signed_token(token)
    role_str = payload.get("role", "")

    try:
        role = Role(role_str)
    except ValueError:
        raise HTTPException(status_code=401, detail=f"Unrecognized role '{role_str}' in signed token.")

    # 3. If client also sent X-Bayora-Role, ensure it matches verified token
    if x_bayora_role and x_bayora_role.lower() != role.value:
        raise HTTPException(
            status_code=403,
            detail=f"Role mismatch: X-Bayora-Role '{x_bayora_role}' does not match signed token role '{role.value}'.",
        )

    return role


def require_role(*allowed_roles: Role) -> Callable[[Role], Role]:
    """
    FastAPI dependency to enforce that the caller's verified role is in allowed_roles.
    """
    def check_role(current_role: Role = Depends(get_current_role)) -> Role:
        if current_role not in allowed_roles:
            allowed_names = [r.value for r in allowed_roles]
            raise HTTPException(
                status_code=403,
                detail=f"Forbidden: Role '{current_role.value}' lacks required permissions ({allowed_names}).",
            )
        return current_role
    return check_role


def sanitize_policy_for_role(policy_data: Dict[str, Any], role: Role) -> Dict[str, Any]:
    """Red team must not see confidential blue team defence logic."""
    data = dict(policy_data)
    if role == Role.RED_TEAM:
        data["rules_json"] = {
            "redacted": True,
            "reason": "Blue team policy logic is confidential and hidden from Red team assessors.",
        }
    return data


def sanitize_test_case_for_role(test_case: Dict[str, Any], role: Role) -> Dict[str, Any]:
    """
    Blue team cannot view raw hidden attack payloads in advance.
    Auditors see canary tokens masked.
    """
    data = dict(test_case)
    if role == Role.BLUE_TEAM:
        # Mask sensitive attack injection strings
        prompt = data.get("prompt", "")
        if len(prompt) > 20:
            data["prompt"] = f"[REDACTED PAYLOAD - {len(prompt)} bytes hidden from Blue team]"
    elif role == Role.AUDITOR:
        prompt = data.get("prompt", "")
        if "CANARY" in prompt:
            data["prompt"] = prompt.replace("CANARY", "[MASKED_CANARY]")
        resp = data.get("model_response")
        if resp and "CANARY" in resp:
            data["model_response"] = resp.replace("CANARY", "[MASKED_CANARY]")
    return data

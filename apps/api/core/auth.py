from enum import Enum
from typing import Any, Dict, List, Optional
from fastapi import Header


class Role(str, Enum):
    OPERATOR = "operator"
    RED_TEAM = "red_team"
    BLUE_TEAM = "blue_team"
    AUDITOR = "auditor"


def get_current_role(
    x_bayora_role: Optional[str] = Header(default="operator", alias="X-Bayora-Role")
) -> Role:
    """Extract role from X-Bayora-Role header, defaulting safely to operator for demo."""
    if not x_bayora_role:
        return Role.OPERATOR
    try:
        return Role(x_bayora_role.lower())
    except ValueError:
        return Role.OPERATOR


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

"""
Bayora Policy Gateway
Mediation, allow-listing, rate limits, timeouts, and clean context handling.
Every model request MUST pass through the gateway.
"""

import hashlib
import json
import re
import time
from typing import Any, Dict, Optional, Tuple
import httpx
from apps.api.core.config import settings


class PolicyGateway:
    def __init__(self, target_url: Optional[str] = None):
        self.target_url = target_url or settings.TARGET_MODEL_URL

    def evaluate_request(
        self,
        prompt: str,
        policy_rules: Dict[str, Any],
        request_count: int,
        request_budget: int,
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Evaluate prompt against policy rules.
        Returns: (is_allowed, reason_code, message)
        """
        # 1. Budget enforcement
        if request_count > request_budget:
            return (
                False,
                "BUDGET_EXCEEDED",
                f"Run request budget of {request_budget} exceeded (attempt #{request_count}).",
            )

        # 2. Length check
        max_len = policy_rules.get("max_prompt_length", 4096)
        if len(prompt) > max_len:
            return (
                False,
                "POLICY_PAYLOAD_TOO_LARGE",
                f"Prompt length {len(prompt)} exceeds policy maximum {max_len}.",
            )

        # 3. Blocked keywords check (case-insensitive)
        blocked_keywords = policy_rules.get("blocked_keywords", [])
        lower_prompt = prompt.lower()
        for kw in blocked_keywords:
            if kw.lower() in lower_prompt:
                return (
                    False,
                    "POLICY_BLOCKED_KEYWORD",
                    f"Prompt contains prohibited keyword: '{kw}'",
                )

        # 4. Regex patterns check
        regex_patterns = policy_rules.get("regex_patterns", [])
        for pat in regex_patterns:
            if re.search(pat, prompt):
                return (
                    False,
                    "POLICY_REGEX_VIOLATION",
                    f"Prompt matches prohibited pattern: '{pat}'",
                )

        # 5. Canary token leak check
        if policy_rules.get("block_canary_tokens", True):
            if re.search(r"CANARY-[A-Z0-9_-]{4,}", prompt):
                return (
                    False,
                    "POLICY_CANARY_TOKEN_VIOLATION",
                    "Prompt attempted to inject or extract canary token.",
                )

        return True, "ALLOWED", "Request passed all policy gateway checks."

    async def forward_to_model(
        self,
        session_id: str,
        prompt: str,
        model_id: str,
        timeout_ms: int = 5000,
    ) -> Tuple[Optional[str], float, Optional[str]]:
        """
        Forward allowed request to Target Model Adapter.
        Returns: (response_text, latency_ms, error_str)
        """
        start_time = time.perf_counter()
        timeout_sec = max(timeout_ms / 1000.0, 0.5)

        payload = {
            "session_id": session_id,
            "prompt": prompt,
            "model_id": model_id,
        }

        try:
            async with httpx.AsyncClient(timeout=timeout_sec) as client:
                res = await client.post(
                    f"{self.target_url}/v1/completions",
                    json=payload,
                )
                latency_ms = (time.perf_counter() - start_time) * 1000.0

                if res.status_code == 200:
                    data = res.json()
                    response_text = data.get("response", "")
                    return response_text, round(latency_ms, 2), None
                else:
                    return None, round(latency_ms, 2), f"Target HTTP {res.status_code}: {res.text}"

        except httpx.TimeoutException:
            latency_ms = (time.perf_counter() - start_time) * 1000.0
            return None, round(latency_ms, 2), f"Gateway timed out after {timeout_ms}ms"
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000.0
            return None, round(latency_ms, 2), f"Target connection error: {str(e)}"

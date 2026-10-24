from __future__ import annotations

import asyncio
import logging
import random
import time
from typing import Any, Dict, List, Optional
import httpx

from apps.api.core.config import settings
from services.providers.base import (
    BaseModelProvider,
    ModelInfo,
    ModelMessage,
    ProviderError,
    ProviderRequest,
    ProviderResponse,
)
from services.providers.ssrf import validate_endpoint_url

logger = logging.getLogger("bayora.providers.gemini")


def sanitize_gemini_secret(text: str, secret: str) -> str:
    """Strip API key from text or URL query strings."""
    if not secret:
        return text
    clean = text.replace(secret, "[REDACTED_GEMINI_KEY]")
    # Also strip ?key=... query param pattern
    import re
    return re.sub(r"key=[a-zA-Z0-9_\-]+", "key=[REDACTED]", clean)


class GeminiProvider(BaseModelProvider):
    """
    Google Gemini Provider Adapter.
    Uses asynchronous HTTP client to invoke the official Google Gemini generateContent API.
    """

    def __init__(
        self,
        client: Optional[httpx.AsyncClient] = None,
        api_key: Optional[str] = None,
    ):
        self._external_client = client
        self._api_key = api_key

    @property
    def provider_id(self) -> str:
        return "gemini"

    def is_configured(self) -> bool:
        key = self._api_key if self._api_key is not None else settings.GEMINI_API_KEY
        return bool(key.strip())

    def get_models(self) -> List[ModelInfo]:
        configured = self.is_configured()
        model_names = [m.strip() for m in settings.GEMINI_MODELS.split(",") if m.strip()]
        if not model_names:
            model_names = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]

        result = []
        for m in model_names:
            result.append(
                ModelInfo(
                    id=m,
                    provider="gemini",
                    name=f"Google {m.replace('-', ' ').title()}",
                    description=f"Google Gemini model profile for {m}",
                    is_mock=False,
                    available=configured,
                )
            )
        return result

    async def generate(self, req: ProviderRequest) -> ProviderResponse:
        api_key = (self._api_key if self._api_key is not None else settings.GEMINI_API_KEY).strip()
        if not api_key:
            raise ProviderError(
                category="AUTHENTICATION",
                message="Google Gemini API key is missing. Set GEMINI_API_KEY on the server.",
                retryable=False,
            )

        raw_base_url = settings.GEMINI_BASE_URL.strip() or "https://generativelanguage.googleapis.com/v1beta"
        allowed_hosts = [h.strip() for h in settings.ALLOWED_CUSTOM_HOSTS.split(",") if h.strip()]
        validated_base_url = validate_endpoint_url(
            raw_base_url,
            allow_private=settings.ALLOW_PRIVATE_ENDPOINTS,
            allowed_hosts=allowed_hosts if allowed_hosts else None,
        )

        # Build Gemini request contents
        system_instruction: Optional[Dict[str, Any]] = None
        contents: List[Dict[str, Any]] = []

        for m in req.messages:
            if m.role == "system":
                system_instruction = {"parts": [{"text": m.content}]}
            else:
                role_str = "user" if m.role == "user" else "model"
                contents.append({"role": role_str, "parts": [{"text": m.content}]})

        if not contents:
            contents.append({"role": "user", "parts": [{"text": "Hello"}]})

        body: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "maxOutputTokens": min(req.max_tokens or 1024, settings.MAX_OUTPUT_TOKENS),
                "temperature": req.temperature,
            },
        }
        if system_instruction:
            body["systemInstruction"] = system_instruction

        # Send via query parameter or x-goog-api-key header
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
            "User-Agent": f"Bayora-Security-Runner/{settings.VERSION}",
        }

        # Model name clean (strip provider prefix if present)
        clean_model = req.model.replace("gemini/", "").replace("gemini:", "")
        endpoint = f"{validated_base_url}/models/{clean_model}:generateContent"

        connect_timeout = min(settings.INFERENCE_CONNECT_TIMEOUT_SEC, req.timeout_sec)
        read_timeout = req.timeout_sec
        timeout_config = httpx.Timeout(read_timeout, connect=connect_timeout)

        max_attempts = 1 + max(0, settings.INFERENCE_MAX_RETRIES)
        last_error: Optional[ProviderError] = None

        for attempt in range(1, max_attempts + 1):
            start_time = time.perf_counter()
            try:
                if self._external_client:
                    res = await self._external_client.post(
                        endpoint,
                        json=body,
                        headers=headers,
                        timeout=timeout_config,
                    )
                else:
                    async with httpx.AsyncClient(timeout=timeout_config) as client:
                        res = await client.post(
                            endpoint,
                            json=body,
                            headers=headers,
                        )

                latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if not candidates:
                        prompt_feedback = data.get("promptFeedback", {})
                        block_reason = prompt_feedback.get("blockReason", "EMPTY_CANDIDATES")
                        return ProviderResponse(
                            text="",
                            provider="gemini",
                            model=req.model,
                            finish_reason=block_reason,
                            input_tokens=None,
                            output_tokens=0,
                            latency_ms=latency_ms,
                            is_mock=False,
                            raw_metadata={"blockReason": block_reason, "promptFeedback": prompt_feedback},
                        )

                    first_candidate = candidates[0]
                    content_obj = first_candidate.get("content", {})
                    parts = content_obj.get("parts", [])
                    response_text = "".join(p.get("text", "") for p in parts if "text" in p)
                    finish_reason = first_candidate.get("finishReason", "STOP")
                    if not response_text and finish_reason in ("SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT"):
                        response_text = f"[{finish_reason}_BLOCK: Generation stopped by model safety system]"

                    usage = data.get("usageMetadata", {})
                    input_tokens = usage.get("promptTokenCount")
                    output_tokens = usage.get("candidatesTokenCount")

                    return ProviderResponse(
                        text=response_text,
                        provider="gemini",
                        model=req.model,
                        finish_reason=finish_reason,
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                        latency_ms=latency_ms,
                        is_mock=False,
                        raw_metadata={
                            "finishReason": finish_reason,
                            "safetyRatings": first_candidate.get("safetyRatings", []),
                        },
                    )

                error_body = res.text
                sanitized_error = sanitize_gemini_secret(error_body, api_key)

                if res.status_code in (401, 403):
                    raise ProviderError(
                        category="AUTHENTICATION",
                        message=f"Gemini API authentication failed (HTTP {res.status_code}). Check GEMINI_API_KEY.",
                        retryable=False,
                        status_code=res.status_code,
                    )
                elif res.status_code == 429:
                    last_error = ProviderError(
                        category="RATE_LIMIT",
                        message=f"Gemini quota or rate limit exceeded: {sanitized_error[:200]}",
                        retryable=True,
                        status_code=429,
                    )
                elif res.status_code in (400, 422):
                    raise ProviderError(
                        category="INVALID_REQUEST",
                        message=f"Gemini rejected request parameters: {sanitized_error[:200]}",
                        retryable=False,
                        status_code=res.status_code,
                    )
                elif res.status_code >= 500:
                    last_error = ProviderError(
                        category="SERVER_ERROR",
                        message=f"Gemini server error (HTTP {res.status_code}): {sanitized_error[:200]}",
                        retryable=True,
                        status_code=res.status_code,
                    )
                else:
                    raise ProviderError(
                        category="INVALID_REQUEST",
                        message=f"Gemini returned HTTP {res.status_code}: {sanitized_error[:200]}",
                        retryable=False,
                        status_code=res.status_code,
                    )

            except httpx.TimeoutException:
                last_error = ProviderError(
                    category="TIMEOUT",
                    message=f"Gemini request timed out after {req.timeout_sec}s.",
                    retryable=True,
                )
            except httpx.ConnectError as e:
                sanitized_msg = sanitize_gemini_secret(str(e), api_key)
                last_error = ProviderError(
                    category="CONNECTION_ERROR",
                    message=f"Failed to connect to Gemini endpoint: {sanitized_msg}",
                    retryable=True,
                )
            except ProviderError:
                raise
            except Exception as e:
                sanitized_msg = sanitize_gemini_secret(str(e), api_key)
                last_error = ProviderError(
                    category="CONNECTION_ERROR",
                    message=f"Unexpected Gemini client error: {sanitized_msg}",
                    retryable=True,
                )

            if attempt < max_attempts and last_error and last_error.retryable:
                backoff_time = (0.5 * (2 ** (attempt - 1))) + random.uniform(0.1, 0.3)
                logger.warning(
                    f"Gemini attempt {attempt}/{max_attempts} failed ({last_error.category}). Retrying in {backoff_time:.2f}s..."
                )
                await asyncio.sleep(backoff_time)
            else:
                break

        if last_error:
            raise last_error

        raise ProviderError(category="SERVER_ERROR", message="Inference request failed with unknown state.", retryable=False)

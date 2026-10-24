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

logger = logging.getLogger("bayora.providers.openai")


def sanitize_secret_text(text: str, secret: str) -> str:
    """Ensure secret key never appears in error messages."""
    if not secret or len(secret) < 4:
        return text
    return text.replace(secret, "[REDACTED_API_KEY]")


class OpenAIProvider(BaseModelProvider):
    """
    OpenAI-compatible Chat Completions Provider Adapter.
    Supports official OpenAI, vLLM, Ollama, and self-hosted compatible endpoints.
    """

    def __init__(
        self,
        client: Optional[httpx.AsyncClient] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        self._external_client = client
        self._api_key = api_key
        self._base_url = base_url

    @property
    def provider_id(self) -> str:
        return "openai"

    def is_configured(self) -> bool:
        # If pointing to standard OpenAI, key is required.
        # If pointing to local Ollama / vLLM (custom base_url), key can be dummy or optional.
        base_url = self._base_url or settings.OPENAI_BASE_URL or "https://api.openai.com/v1"
        is_custom_local = "localhost" in base_url or "127.0.0.1" in base_url
        if is_custom_local:
            return True
        key = self._api_key if self._api_key is not None else settings.OPENAI_API_KEY
        return bool(key.strip())

    def get_models(self) -> List[ModelInfo]:
        configured = self.is_configured()
        model_names = [m.strip() for m in settings.OPENAI_MODELS.split(",") if m.strip()]
        if not model_names:
            model_names = ["gpt-4o-mini", "gpt-4o", "o3-mini"]

        result = []
        for m in model_names:
            result.append(
                ModelInfo(
                    id=m,
                    provider="openai",
                    name=f"OpenAI {m.upper()}",
                    description=f"OpenAI-compatible model profile for {m}",
                    is_mock=False,
                    available=configured,
                )
            )
        return result

    async def generate(self, req: ProviderRequest) -> ProviderResponse:
        api_key = (self._api_key if self._api_key is not None else settings.OPENAI_API_KEY).strip()
        raw_base_url = (self._base_url if self._base_url is not None else settings.OPENAI_BASE_URL).strip() or "https://api.openai.com/v1"

        # 1. Enforce SSRF validation on the endpoint URL
        allowed_hosts = [h.strip() for h in settings.ALLOWED_CUSTOM_HOSTS.split(",") if h.strip()]
        validated_base_url = validate_endpoint_url(
            raw_base_url,
            allow_private=settings.ALLOW_PRIVATE_ENDPOINTS,
            allowed_hosts=allowed_hosts if allowed_hosts else None,
        )

        # 2. Check credentials for non-local endpoints
        is_local = "localhost" in validated_base_url or "127.0.0.1" in validated_base_url
        if not is_local and not api_key:
            raise ProviderError(
                category="AUTHENTICATION",
                message="OpenAI API key is missing. Set OPENAI_API_KEY on the server.",
                retryable=False,
            )

        # 3. Build payload
        messages_payload = [{"role": m.role, "content": m.content} for m in req.messages]
        payload: Dict[str, Any] = {
            "model": req.model,
            "messages": messages_payload,
            "max_tokens": min(req.max_tokens or 1024, settings.MAX_OUTPUT_TOKENS),
            "temperature": req.temperature,
        }

        headers = {
            "Content-Type": "application/json",
            "User-Agent": f"Bayora-Security-Runner/{settings.VERSION}",
        }
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        endpoint = f"{validated_base_url}/chat/completions"
        connect_timeout = min(settings.INFERENCE_CONNECT_TIMEOUT_SEC, req.timeout_sec)
        read_timeout = req.timeout_sec
        timeout_config = httpx.Timeout(read_timeout, connect=connect_timeout)

        max_attempts = 1 + max(0, settings.INFERENCE_MAX_RETRIES)
        last_error: Optional[ProviderError] = None

        for attempt in range(1, max_attempts + 1):
            start_time = time.perf_counter()
            try:
                # Use passed client if injected (e.g. in tests) or create controlled context
                if self._external_client:
                    res = await self._external_client.post(
                        endpoint,
                        json=payload,
                        headers=headers,
                        timeout=timeout_config,
                    )
                else:
                    async with httpx.AsyncClient(timeout=timeout_config) as client:
                        res = await client.post(
                            endpoint,
                            json=payload,
                            headers=headers,
                        )

                latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

                # Handle HTTP Status
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if not choices:
                        raise ProviderError(
                            category="SERVER_ERROR",
                            message="Provider returned 200 OK but choices array is empty.",
                            retryable=True,
                        )

                    first_choice = choices[0]
                    message_obj = first_choice.get("message", {})
                    response_text = message_obj.get("content", "") or ""
                    finish_reason = first_choice.get("finish_reason")

                    usage = data.get("usage", {})
                    input_tokens = usage.get("prompt_tokens")
                    output_tokens = usage.get("completion_tokens")
                    request_id = data.get("id")

                    return ProviderResponse(
                        text=response_text,
                        provider="openai",
                        model=req.model,
                        finish_reason=finish_reason,
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                        latency_ms=latency_ms,
                        request_id=request_id,
                        is_mock=False,
                        raw_metadata={
                            "provider": "openai",
                            "status_code": 200,
                            "finish_reason": finish_reason,
                        },
                    )

                # Error status handling
                error_body = res.text
                sanitized_error = sanitize_secret_text(error_body, api_key)

                if res.status_code in (401, 403):
                    raise ProviderError(
                        category="AUTHENTICATION",
                        message=f"Provider authentication failed (HTTP {res.status_code}). Check OPENAI_API_KEY.",
                        retryable=False,
                        status_code=res.status_code,
                    )
                elif res.status_code == 429:
                    retry_after_hdr = res.headers.get("retry-after")
                    wait_sec = float(retry_after_hdr) if retry_after_hdr and retry_after_hdr.isdigit() else 1.0
                    last_error = ProviderError(
                        category="RATE_LIMIT",
                        message=f"Provider rate limit or quota exceeded: {sanitized_error[:200]}",
                        retryable=True,
                        status_code=429,
                        details={"retry_after": wait_sec},
                    )
                elif res.status_code in (400, 422):
                    raise ProviderError(
                        category="INVALID_REQUEST",
                        message=f"Provider rejected request parameters: {sanitized_error[:200]}",
                        retryable=False,
                        status_code=res.status_code,
                    )
                elif res.status_code >= 500:
                    last_error = ProviderError(
                        category="SERVER_ERROR",
                        message=f"Provider server error (HTTP {res.status_code}): {sanitized_error[:200]}",
                        retryable=True,
                        status_code=res.status_code,
                    )
                else:
                    raise ProviderError(
                        category="INVALID_REQUEST",
                        message=f"Provider returned unexpected HTTP {res.status_code}: {sanitized_error[:200]}",
                        retryable=False,
                        status_code=res.status_code,
                    )

            except httpx.TimeoutException:
                last_error = ProviderError(
                    category="TIMEOUT",
                    message=f"Provider request timed out after {req.timeout_sec}s.",
                    retryable=True,
                )
            except httpx.ConnectError as e:
                sanitized_msg = sanitize_secret_text(str(e), api_key)
                last_error = ProviderError(
                    category="CONNECTION_ERROR",
                    message=f"Failed to connect to provider endpoint: {sanitized_msg}",
                    retryable=True,
                )
            except ProviderError:
                raise
            except Exception as e:
                sanitized_msg = sanitize_secret_text(str(e), api_key)
                last_error = ProviderError(
                    category="CONNECTION_ERROR",
                    message=f"Unexpected client exception: {sanitized_msg}",
                    retryable=True,
                )

            # Retry loop backoff
            if attempt < max_attempts and last_error and last_error.retryable:
                backoff_time = (0.5 * (2 ** (attempt - 1))) + random.uniform(0.1, 0.3)
                if last_error.category == "RATE_LIMIT":
                    backoff_time = max(backoff_time, last_error.details.get("retry_after", 1.0))
                logger.warning(
                    f"OpenAI call attempt {attempt}/{max_attempts} failed ({last_error.category}). Retrying in {backoff_time:.2f}s..."
                )
                await asyncio.sleep(backoff_time)
            else:
                break

        if last_error:
            raise last_error

        raise ProviderError(category="SERVER_ERROR", message="Inference request failed with unknown state.", retryable=False)

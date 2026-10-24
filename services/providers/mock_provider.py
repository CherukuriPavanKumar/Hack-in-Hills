from __future__ import annotations

import asyncio
import time
from typing import List, Optional

from apps.api.core.config import settings
from services.providers.base import (
    BaseModelProvider,
    ModelInfo,
    ProviderError,
    ProviderRequest,
    ProviderResponse,
)
from services.target_model.target_adapter import (
    SESSION_MEMORY,
    generate_deterministic_completion,
)


class MockProvider(BaseModelProvider):
    """
    Deterministic Mock Provider for offline development and acceptance testing.
    Must only be available when settings.MOCK_MODE_ENABLED is True.
    """

    def __init__(self, enabled: Optional[bool] = None):
        self._enabled = enabled

    @property
    def provider_id(self) -> str:
        return "mock"

    def is_configured(self) -> bool:
        if self._enabled is not None:
            return self._enabled
        return settings.MOCK_MODE_ENABLED

    def get_models(self) -> List[ModelInfo]:
        if not self.is_configured():
            return []
        return [
            ModelInfo(
                id="mock-deterministic-v1",
                provider="mock",
                name="Deterministic Baseline Model (Mock)",
                description="Deterministic offline model with standard compliance and basic prompt guardrails.",
                is_mock=True,
                available=True,
            ),
            ModelInfo(
                id="mock-adversarial-weak-v1",
                provider="mock",
                name="Adversarial Weak Model Profile (Mock)",
                description="Simulated vulnerable model susceptible to DAN/jailbreak instructions.",
                is_mock=True,
                available=True,
            ),
        ]

    async def generate(self, req: ProviderRequest) -> ProviderResponse:
        if not self.is_configured():
            raise ProviderError(
                category="CONFIG_ERROR",
                message="Mock provider execution is disabled in this environment (MOCK_MODE_ENABLED=false).",
                retryable=False,
            )

        start_time = time.perf_counter()
        # Realistic slight simulated latency (25ms)
        await asyncio.sleep(0.025)

        # Build prompt from messages
        prompt_text = ""
        for m in req.messages:
            prompt_text += f"{m.content}\n"
        prompt_text = prompt_text.strip()

        # Session memory
        sess_id = req.session_id or "default"
        if sess_id not in SESSION_MEMORY:
            SESSION_MEMORY[sess_id] = []
        history = SESSION_MEMORY[sess_id]

        response_text = generate_deterministic_completion(prompt_text, req.model, history)
        history.append({"role": "user", "content": prompt_text})
        history.append({"role": "assistant", "content": response_text})

        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        # Estimate tokens roughly
        in_tokens = max(1, len(prompt_text.split()))
        out_tokens = max(1, len(response_text.split()))

        return ProviderResponse(
            text=response_text,
            provider="mock",
            model=req.model,
            finish_reason="stop",
            input_tokens=in_tokens,
            output_tokens=out_tokens,
            latency_ms=elapsed_ms,
            request_id=f"mock_req_{int(time.time() * 1000)}",
            is_mock=True,
            raw_metadata={"session_id": sess_id, "mock_mode": True},
        )

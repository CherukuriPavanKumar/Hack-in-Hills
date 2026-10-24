from __future__ import annotations

import asyncio
from typing import Dict, List, Optional, Tuple
import httpx

from apps.api.core.config import settings
from services.providers.base import (
    BaseModelProvider,
    ModelInfo,
    ProviderError,
    ProviderRequest,
    ProviderResponse,
)
from services.providers.gemini_provider import GeminiProvider
from services.providers.mock_provider import MockProvider
from services.providers.openai_provider import OpenAIProvider


class ModelProviderRegistry:
    """
    Central server-side registry for all model providers.
    Normalizes resolution, concurrency bounds, and availability gating.
    """

    def __init__(
        self,
        shared_client: Optional[httpx.AsyncClient] = None,
        max_concurrent_calls: Optional[int] = None,
    ):
        self._shared_client = shared_client
        self._max_concurrency = max_concurrent_calls
        self._providers: Dict[str, BaseModelProvider] = {}
        self._semaphore: Optional[asyncio.Semaphore] = None
        self._initialize_providers()

    def _initialize_providers(self):
        self._providers["mock"] = MockProvider()
        self._providers["openai"] = OpenAIProvider(client=self._shared_client)
        self._providers["gemini"] = GeminiProvider(client=self._shared_client)

    def register(self, provider_id: str, provider: BaseModelProvider):
        self._providers[provider_id.lower().strip()] = provider

    def is_available(self, provider_id: str) -> bool:
        clean = provider_id.lower().strip()
        p = self._providers.get(clean)
        return p.is_available() if p else False

    @property
    def semaphore(self) -> asyncio.Semaphore:
        if self._semaphore is None:
            limit = self._max_concurrency or settings.INFERENCE_MAX_CONCURRENCY
            self._semaphore = asyncio.Semaphore(limit)
        return self._semaphore

    def get_provider(self, provider_id: str) -> BaseModelProvider:
        clean_id = provider_id.lower().strip()
        if clean_id not in self._providers:
            raise ProviderError(
                category="CONFIG_ERROR",
                message=f"Unsupported provider '{provider_id}'. Supported: {list(self._providers.keys())}",
                retryable=False,
            )
        return self._providers[clean_id]

    def resolve_provider_and_model(self, model_id: str, provider_id: Optional[str] = None) -> Tuple[BaseModelProvider, str]:
        """
        Determine provider instance and normalized model name from inputs.
        Supports explicit provider prefixes like 'openai:gpt-4o' or 'gemini:gemini-1.5-flash'.
        """
        clean_model = model_id.strip()

        # Check for composite prefix like "provider:model"
        if ":" in clean_model and not clean_model.startswith("mock-"):
            prefix, actual_model = clean_model.split(":", 1)
            prefix = prefix.lower().strip()
            if prefix in self._providers:
                return self.get_provider(prefix), actual_model.strip()

        # If provider_id is explicitly passed
        if provider_id:
            return self.get_provider(provider_id), clean_model

        # Auto-detect by model name
        if clean_model.startswith("mock-"):
            return self.get_provider("mock"), clean_model

        if clean_model.startswith("gemini"):
            return self.get_provider("gemini"), clean_model

        if clean_model.startswith(("gpt-", "o1", "o3", "text-", "claude")):
            return self.get_provider("openai"), clean_model

        # Check configured default provider
        default_prov = settings.DEFAULT_PROVIDER.lower().strip()
        if default_prov in self._providers:
            return self.get_provider(default_prov), clean_model

        # Fallback to mock if enabled, otherwise fail
        if settings.MOCK_MODE_ENABLED:
            return self.get_provider("mock"), clean_model

        raise ProviderError(
            category="CONFIG_ERROR",
            message=f"Cannot determine model provider for model '{model_id}' and mock mode is disabled.",
            retryable=False,
        )

    def list_available_models(self) -> List[ModelInfo]:
        """
        Return safe list of all registered models and their availability status.
        Does NOT reveal API keys or secret credentials.
        """
        all_models: List[ModelInfo] = []
        for prov_id, prov in self._providers.items():
            try:
                models = prov.get_models()
                all_models.extend(models)
            except Exception:
                continue
        return all_models

    async def generate(self, req: ProviderRequest, provider_name: Optional[str] = None) -> ProviderResponse:
        """
        Execute request with bounded concurrency and fail-safe checks.
        """
        target_provider = provider_name or req.provider
        provider, resolved_model = self.resolve_provider_and_model(req.model, target_provider)
        req.model = resolved_model

        if not provider.is_configured():
            if provider.provider_id == "mock":
                raise ProviderError(
                    category="CONFIG_ERROR",
                    message="Mock provider is disabled in this environment (MOCK_MODE_ENABLED=false).",
                    retryable=False,
                )
            raise ProviderError(
                category="AUTHENTICATION",
                message=f"Provider '{provider.provider_id}' is not configured with valid credentials on the server.",
                retryable=False,
            )

        # Enforce global in-flight concurrency bound
        async with self.semaphore:
            return await provider.generate(req)


# Global registry singleton
_registry: Optional[ModelProviderRegistry] = None


def get_provider_registry() -> ModelProviderRegistry:
    global _registry
    if _registry is None:
        _registry = ModelProviderRegistry()
    return _registry

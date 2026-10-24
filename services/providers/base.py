from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ModelMessage:
    role: str  # "system", "user", "assistant"
    content: str


@dataclass
class ProviderRequest:
    provider: str
    model: str
    messages: List[ModelMessage]
    max_tokens: int = 1024
    temperature: float = 0.0
    timeout_sec: float = 30.0
    session_id: str = ""
    extra_params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ProviderResponse:
    text: str
    provider: str
    model: str
    finish_reason: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    latency_ms: float = 0.0
    request_id: Optional[str] = None
    is_mock: bool = False
    raw_metadata: Dict[str, Any] = field(default_factory=dict)


class ProviderError(Exception):
    """
    Normalized Provider Error with machine-readable category and retry eligibility.
    """
    def __init__(
        self,
        category: str,  # TIMEOUT, RATE_LIMIT, AUTHENTICATION, INVALID_REQUEST, SERVER_ERROR, CONNECTION_ERROR, SSRF_BLOCKED, CONFIG_ERROR
        message: str,
        retryable: bool = False,
        status_code: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.category = category
        self.message = message
        self.retryable = retryable
        self.status_code = status_code
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "category": self.category,
            "message": self.message,
            "retryable": self.retryable,
            "status_code": self.status_code,
        }


@dataclass
class ModelInfo:
    id: str
    provider: str
    name: str
    description: str
    is_mock: bool
    available: bool


class BaseModelProvider(ABC):
    """
    Abstract Base Class for BAYORA Model Providers.
    """

    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Unique provider identifier (e.g. 'openai', 'gemini', 'mock')."""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Return True if credentials and endpoints are configured and valid."""
        pass

    def is_available(self) -> bool:
        """Convenience alias for is_configured()."""
        return self.is_configured()

    @abstractmethod
    def get_models(self) -> List[ModelInfo]:
        """Return list of models supported and configured for this provider."""
        pass

    @abstractmethod
    async def generate(self, req: ProviderRequest) -> ProviderResponse:
        """
        Execute completion request against target model.
        Raises ProviderError on failure.
        """
        pass

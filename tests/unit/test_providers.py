import json
import pytest
import httpx
from services.providers.base import (
    ModelMessage,
    ProviderRequest,
    ProviderResponse,
    ProviderError,
)
from services.providers.ssrf import validate_endpoint_url
from services.providers.mock_provider import MockProvider
from services.providers.openai_provider import OpenAIProvider
from services.providers.gemini_provider import GeminiProvider
from services.providers.registry import ModelProviderRegistry


def test_ssrf_blocks_private_and_cloud_metadata():
    # Cloud metadata
    with pytest.raises(ProviderError) as exc_info:
        validate_endpoint_url("http://169.254.169.254/latest/meta-data")
    assert exc_info.value.category == "SSRF_BLOCKED"

    with pytest.raises(ProviderError) as exc_info:
        validate_endpoint_url("http://metadata.google.internal/computeMetadata/v1")
    assert exc_info.value.category == "SSRF_BLOCKED"

    # Loopback
    with pytest.raises(ProviderError) as exc_info:
        validate_endpoint_url("http://127.0.0.1:8000/v1")
    assert exc_info.value.category == "SSRF_BLOCKED"

    with pytest.raises(ProviderError) as exc_info:
        validate_endpoint_url("http://localhost:8000/v1")
    assert exc_info.value.category == "SSRF_BLOCKED"

    # RFC 1918 Private ranges
    with pytest.raises(ProviderError) as exc_info:
        validate_endpoint_url("http://10.0.0.5:8080/v1")
    assert exc_info.value.category == "SSRF_BLOCKED"

    with pytest.raises(ProviderError) as exc_info:
        validate_endpoint_url("http://192.168.1.100/v1")
    assert exc_info.value.category == "SSRF_BLOCKED"

    # Invalid scheme
    with pytest.raises(ProviderError) as exc_info:
        validate_endpoint_url("ftp://example.com/api")
    assert exc_info.value.category == "SSRF_BLOCKED"


def test_ssrf_allows_custom_hosts_or_private_when_configured():
    # Whitelisted custom host
    validate_endpoint_url("http://internal-ollama:11434/v1", allowed_custom_hosts=["internal-ollama"])

    # Global private endpoints flag
    validate_endpoint_url("http://127.0.0.1:11434/v1", allow_private=True)


@pytest.mark.asyncio
async def test_mock_provider_success():
    provider = MockProvider(enabled=True)
    assert provider.is_available() is True

    req = ProviderRequest(
        provider="mock",
        model="mock-deterministic-v1",
        messages=[ModelMessage(role="user", content="Hello world")],
    )
    resp = await provider.generate(req)
    assert isinstance(resp, ProviderResponse)
    assert resp.is_mock is True
    assert resp.provider == "mock"
    assert resp.input_tokens > 0
    assert resp.output_tokens > 0
    assert resp.finish_reason == "stop"


@pytest.mark.asyncio
async def test_mock_provider_rejected_when_disabled():
    provider = MockProvider(enabled=False)
    assert provider.is_available() is False

    req = ProviderRequest(
        provider="mock",
        model="mock-deterministic-v1",
        messages=[ModelMessage(role="user", content="Hello world")],
    )
    with pytest.raises(ProviderError) as exc_info:
        await provider.generate(req)
    assert exc_info.value.category == "CONFIG_ERROR"


@pytest.mark.asyncio
async def test_openai_provider_success():
    def mock_handler(request: httpx.Request):
        data = {
            "id": "chatcmpl-test",
            "choices": [
                {
                    "message": {"role": "assistant", "content": "I am a secure AI assistant."},
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": 12,
                "completion_tokens": 8,
                "total_tokens": 20,
            },
        }
        return httpx.Response(200, json=data)

    transport = httpx.MockTransport(mock_handler)
    client = httpx.AsyncClient(transport=transport)

    provider = OpenAIProvider(
        api_key="sk-test-secret-key-12345",
        base_url="https://api.openai.com/v1",
        client=client,
    )

    req = ProviderRequest(
        provider="openai",
        model="gpt-4o",
        messages=[ModelMessage(role="user", content="Hello")],
    )
    resp = await provider.generate(req)
    assert resp.text == "I am a secure AI assistant."
    assert resp.provider == "openai"
    assert resp.input_tokens == 12
    assert resp.output_tokens == 8
    assert resp.finish_reason == "stop"
    assert resp.is_mock is False


@pytest.mark.asyncio
async def test_openai_provider_auth_failure_sanitizes_secret():
    secret_key = "sk-super-secret-production-key-999"

    def mock_handler(request: httpx.Request):
        return httpx.Response(401, json={"error": {"message": "Invalid API key provided"}})

    transport = httpx.MockTransport(mock_handler)
    client = httpx.AsyncClient(transport=transport)

    provider = OpenAIProvider(
        api_key=secret_key,
        base_url="https://api.openai.com/v1",
        client=client,
    )

    req = ProviderRequest(
        provider="openai",
        model="gpt-4o",
        messages=[ModelMessage(role="user", content="Hello")],
    )
    with pytest.raises(ProviderError) as exc_info:
        await provider.generate(req)

    err = exc_info.value
    assert err.category == "AUTHENTICATION"
    # Ensure raw secret is never present in string representation or message
    assert secret_key not in str(err)
    assert secret_key not in err.message


@pytest.mark.asyncio
async def test_gemini_provider_success():
    def mock_handler(request: httpx.Request):
        data = {
            "candidates": [
                {
                    "content": {
                        "parts": [{"text": "Gemini safety analysis response."}],
                        "role": "model",
                    },
                    "finishReason": "STOP",
                }
            ],
            "usageMetadata": {
                "promptTokenCount": 15,
                "candidatesTokenCount": 9,
                "totalTokenCount": 24,
            },
        }
        return httpx.Response(200, json=data)

    transport = httpx.MockTransport(mock_handler)
    client = httpx.AsyncClient(transport=transport)

    provider = GeminiProvider(
        api_key="gemini-secret-test-key",
        client=client,
    )

    req = ProviderRequest(
        provider="gemini",
        model="gemini-1.5-pro",
        messages=[ModelMessage(role="user", content="Safety test")],
    )
    resp = await provider.generate(req)
    assert resp.text == "Gemini safety analysis response."
    assert resp.provider == "gemini"
    assert resp.input_tokens == 15
    assert resp.output_tokens == 9
    assert resp.finish_reason == "STOP"
    assert resp.is_mock is False


@pytest.mark.asyncio
async def test_gemini_provider_safety_block():
    def mock_handler(request: httpx.Request):
        data = {
            "candidates": [
                {
                    "finishReason": "SAFETY",
                    "safetyRatings": [
                        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "probability": "HIGH"}
                    ],
                }
            ],
            "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 0},
        }
        return httpx.Response(200, json=data)

    transport = httpx.MockTransport(mock_handler)
    client = httpx.AsyncClient(transport=transport)

    provider = GeminiProvider(
        api_key="gemini-secret-test-key",
        client=client,
    )

    req = ProviderRequest(
        provider="gemini",
        model="gemini-1.5-pro",
        messages=[ModelMessage(role="user", content="Dangerous exploit")],
    )
    resp = await provider.generate(req)
    assert resp.finish_reason == "SAFETY"
    assert "SAFETY_BLOCK" in resp.text


@pytest.mark.asyncio
async def test_registry_resolution_and_concurrency():
    registry = ModelProviderRegistry(max_concurrent_calls=2)
    mock_p = MockProvider(enabled=True)
    registry.register("mock", mock_p)

    assert registry.is_available("mock") is True
    models = registry.list_available_models()
    assert len(models) >= 2
    assert any(m.provider == "mock" for m in models)

    req = ProviderRequest(
        provider="mock",
        model="mock-deterministic-v1",
        messages=[ModelMessage(role="user", content="Ping")],
    )
    resp = await registry.generate(req, provider_name="mock")
    assert resp.provider == "mock"

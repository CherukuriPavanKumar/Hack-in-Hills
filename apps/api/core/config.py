import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    PROJECT_NAME: str = "Bayora"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./bayora.db"
    )
    
    # Internal Network Endpoints
    GATEWAY_URL: str = os.getenv("GATEWAY_URL", "http://gateway:8002")
    BLUE_POLICY_URL: str = os.getenv("BLUE_POLICY_URL", "http://blue-policy:8001")
    RED_RUNNER_URL: str = os.getenv("RED_RUNNER_URL", "http://red-runner:8004")
    TARGET_MODEL_URL: str = os.getenv("TARGET_MODEL_URL", "http://target-model:8003")
    
    # Application Environment & Mock Controls
    APP_ENV: str = os.getenv("APP_ENV", "development")
    MOCK_MODE_ENABLED: bool = os.getenv("MOCK_MODE_ENABLED", "true").lower() in ("true", "1", "yes")
    ALLOW_DEMO_TOKEN_ROLE_SELECTION: bool = os.getenv("ALLOW_DEMO_TOKEN_ROLE_SELECTION", "true").lower() in ("true", "1", "yes")
    OPERATOR_MASTER_SECRET: str = os.getenv("OPERATOR_MASTER_SECRET", "")

    # Provider Defaults
    DEFAULT_PROVIDER: str = os.getenv("DEFAULT_PROVIDER", "mock")
    DEFAULT_MODEL_PROFILE: str = os.getenv("DEFAULT_MODEL_PROFILE", "mock-deterministic-v1")

    # OpenAI / Compatible Provider
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODELS: str = os.getenv("OPENAI_MODELS", "gpt-4o,gpt-4o-mini,o3-mini")

    # Google Gemini Provider
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_BASE_URL: str = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
    GEMINI_MODELS: str = os.getenv("GEMINI_MODELS", "gemini-2.0-flash,gemini-1.5-flash,gemini-1.5-pro")

    # SSRF & Self-Hosted Endpoint Restrictions
    ALLOW_PRIVATE_ENDPOINTS: bool = os.getenv("ALLOW_PRIVATE_ENDPOINTS", "false").lower() in ("true", "1", "yes")
    ALLOWED_CUSTOM_HOSTS: str = os.getenv("ALLOWED_CUSTOM_HOSTS", "")

    # Bounded Resilience & Concurrency
    INFERENCE_CONNECT_TIMEOUT_SEC: float = float(os.getenv("INFERENCE_CONNECT_TIMEOUT_SEC", "10.0"))
    INFERENCE_READ_TIMEOUT_SEC: float = float(os.getenv("INFERENCE_READ_TIMEOUT_SEC", "45.0"))
    INFERENCE_MAX_RETRIES: int = int(os.getenv("INFERENCE_MAX_RETRIES", "2"))
    INFERENCE_MAX_CONCURRENCY: int = int(os.getenv("INFERENCE_MAX_CONCURRENCY", "5"))
    MAX_PROMPT_CHARS: int = int(os.getenv("MAX_PROMPT_CHARS", "12000"))
    MAX_OUTPUT_TOKENS: int = int(os.getenv("MAX_OUTPUT_TOKENS", "2048"))

    # Security & Execution limits
    DEFAULT_REQUEST_BUDGET: int = 20
    DEFAULT_TIMEOUT_MS: int = 5000
    AUTH_SECRET_KEY: str = os.getenv("AUTH_SECRET_KEY", "bayora_sec_hmac_key_prod_2026_isolated")
    TOKEN_EXPIRY_SECONDS: int = 86400


settings = Settings()

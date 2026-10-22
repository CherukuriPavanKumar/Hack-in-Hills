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
    
    # Model configuration
    DEFAULT_MODEL_PROFILE: str = "mock-deterministic-v1"
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "")

    # Security & Execution limits
    DEFAULT_REQUEST_BUDGET: int = 20
    DEFAULT_TIMEOUT_MS: int = 5000


settings = Settings()

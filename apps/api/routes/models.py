from __future__ import annotations

from typing import List
from fastapi import APIRouter
from apps.api.schemas.schemas import ModelInfoResponse
from services.providers.registry import get_provider_registry

router = APIRouter(prefix="/models", tags=["Model Providers & Discovery"])


@router.get("", response_model=List[ModelInfoResponse])
def list_available_models():
    """
    List all configured and registered model profiles.
    Exposes zero API keys or internal secrets.
    Indicates whether a provider is configured and whether it is a mock or real model.
    """
    registry = get_provider_registry()
    models = registry.list_available_models()
    return [
        ModelInfoResponse(
            id=m.id,
            provider=m.provider,
            name=m.name,
            description=m.description,
            is_mock=m.is_mock,
            available=m.available,
        )
        for m in models
    ]

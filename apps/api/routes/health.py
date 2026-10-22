import datetime
import os
from fastapi import APIRouter

router = APIRouter(tags=["System & Topology"])


@router.get("/health")
def health_check():
    """Service health status"""
    return {
        "status": "healthy",
        "service": "bayora-control-plane",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "in_docker": bool(os.getenv("RUNNING_IN_DOCKER", False)),
    }


@router.get("/topology")
def get_topology():
    """
    Returns the network isolation topology and permitted vs prohibited paths.
    """
    return {
        "zones": [
            {
                "id": "RED_WORKSPACE",
                "name": "Red-Team Workspace",
                "network": "red-net",
                "description": "Untrusted test runner container executing fixed adversarial test payloads. Zero direct access to target model or blue files.",
                "color": "rose",
            },
            {
                "id": "BLUE_WORKSPACE",
                "name": "Blue-Team Workspace",
                "network": "blue-net",
                "description": "Defensive workspace holding versioned guardrails and policy logic. Strictly partitioned from Red.",
                "color": "indigo",
            },
            {
                "id": "GATEWAY_ZONE",
                "name": "Policy Gateway",
                "network": "red-net + model-net",
                "description": "Enforceable mediation gateway. Inspects prompts, checks budgets, validates run token, evaluates policies.",
                "color": "cyan",
            },
            {
                "id": "MODEL_ZONE",
                "name": "Target Model Zone",
                "network": "model-net",
                "description": "Isolated model runtime (deterministic mock or hosted adapter). Only reachable from Gateway.",
                "color": "emerald",
            },
        ],
        "routes": [
            {"source": "RED_WORKSPACE", "target": "BLUE_WORKSPACE", "permission": "DENIED", "port": 8001},
            {"source": "BLUE_WORKSPACE", "target": "RED_WORKSPACE", "permission": "DENIED", "port": 8004},
            {"source": "RED_WORKSPACE", "target": "MODEL_ZONE", "permission": "DENIED", "port": 8003},
            {"source": "RED_WORKSPACE", "target": "GATEWAY_ZONE", "permission": "ALLOWED", "port": 8002},
            {"source": "GATEWAY_ZONE", "target": "MODEL_ZONE", "permission": "ALLOWED", "port": 8003},
        ],
    }

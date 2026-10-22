"""
Bayora Policy Gateway Standalone HTTP Server
Runs on port 8002, attached to 'red-net' and 'model-net'.
Mediates all requests from red-runner, enforces blue policies, and proxies to target-model.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional
from services.gateway.gateway import PolicyGateway

app = FastAPI(title="Bayora Policy Gateway", version="1.0.0")
gateway = PolicyGateway()


class GatewayRequest(BaseModel):
    session_id: str
    prompt: str
    model_id: str = "mock-deterministic-v1"
    policy_rules: Dict[str, Any]
    request_count: int = 1
    request_budget: int = 20
    timeout_ms: int = 5000


@app.get("/health")
def health():
    return {"status": "healthy", "service": "policy-gateway", "zone": "GATEWAY_ZONE"}


@app.post("/v1/evaluate_and_forward")
async def evaluate_and_forward(req: GatewayRequest):
    # 1. Enforce policy
    is_allowed, reason_code, message = gateway.evaluate_request(
        prompt=req.prompt,
        policy_rules=req.policy_rules,
        request_count=req.request_count,
        request_budget=req.request_budget,
    )

    if not is_allowed:
        return {
            "decision": "DENY",
            "reason_code": reason_code,
            "message": message,
            "response": None,
            "latency_ms": 3.0,
        }

    # 2. Forward to target model
    resp_text, latency, error = await gateway.forward_to_model(
        session_id=req.session_id,
        prompt=req.prompt,
        model_id=req.model_id,
        timeout_ms=req.timeout_ms,
    )

    if error:
        raise HTTPException(status_code=502, detail=error)

    return {
        "decision": "ALLOW",
        "reason_code": reason_code,
        "message": message,
        "response": resp_text,
        "latency_ms": latency,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)

import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class PolicyCreate(BaseModel):
    name: str = Field(..., json_schema_extra={"example": "Hardened Defense Policy"})
    version: str = Field(..., json_schema_extra={"example": "2.1.0"})
    rules_json: Dict[str, Any] = Field(
        ...,
        json_schema_extra={
            "example": {
                "blocked_keywords": ["system prompt", "drop table", "confidential"],
                "regex_patterns": [r"(?i)ignore\s+(all\s+)?prior\s+instructions"],
                "block_canary_tokens": True,
                "max_prompt_length": 4096,
            }
        },
    )
    created_by: str = Field(default="blue_team")


class PolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    version: str
    rules_json: Dict[str, Any]
    created_by: str
    created_at: datetime.datetime
    policy_hash: str


class ModelInfoResponse(BaseModel):
    id: str
    provider: str
    name: str
    description: str
    is_mock: bool
    available: bool


class RunCreate(BaseModel):
    suite_id: str = Field(default="bayora-adv-safety-v1")
    suite_version: str = Field(default="1.0.0")
    model_id: str = Field(default="mock-deterministic-v1")
    model_version: str = Field(default="v1")
    provider: Optional[str] = Field(default=None, description="Optional provider identifier ('mock', 'openai', 'gemini')")
    policy_id: str = Field(default="baseline-guard-v1.0")
    policy_version: str = Field(default="1.0.0")
    request_budget: int = Field(default=20, ge=1, le=100)
    timeout_ms: int = Field(default=5000, ge=500, le=60000)
    temperature: Optional[float] = Field(default=0.0, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=1024, ge=1, le=4096)


class TestCaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: str
    category: str
    prompt: str
    prompt_hash: str
    gateway_decision: str
    gateway_reason: Optional[str] = None
    model_response: Optional[str] = None
    response_hash: Optional[str] = None
    verdict: str
    rationale_code: Optional[str] = None
    latency_ms: float
    executed_at: datetime.datetime
    # Real Provider Metadata
    provider: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    finish_reason: Optional[str] = None
    is_mock: Optional[bool] = False
    error_category: Optional[str] = None


class AuditEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    seq: int
    event_type: str
    timestamp: str
    actor: str
    metadata_json: Dict[str, Any]
    prev_hash: str
    event_hash: str


class BoundaryProbeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    probe_name: str
    source_zone: str
    destination: str
    expected: str
    observed: str
    verdict: str
    evidence_ref: Optional[str] = None
    executed_at: datetime.datetime


class RunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    suite_id: str
    suite_version: str
    suite_hash: str
    model_id: str
    model_version: str
    provider: Optional[str] = None
    policy_id: str
    policy_version: str
    policy_hash: str
    evaluator_version: str
    config_hash: str
    request_budget: int
    timeout_ms: int
    clean_context_enforced: bool
    created_at: datetime.datetime
    started_at: Optional[datetime.datetime] = None
    ended_at: Optional[datetime.datetime] = None
    error_reason: Optional[str] = None
    score_summary: Dict[str, Any] = {}
    test_cases: List[TestCaseResponse] = []
    probes: List[BoundaryProbeResponse] = []


class VerifyResponse(BaseModel):
    run_id: str
    is_valid: bool
    total_events: int
    mismatch_seq: Optional[int] = None
    reason: Optional[str] = None
    verified_at: str


class TamperDrillResponse(BaseModel):
    run_id: str
    tampered: bool
    original_valid: bool
    tampered_valid: bool
    tampered_seq: int
    mismatch_seq: int
    original_event_hash: str
    tampered_event_hash: str
    expected_next_prev_hash: str
    explanation: str


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    run_id: str
    summary_json: Dict[str, Any]
    integrity_status: str
    residual_risks: List[Dict[str, str]]
    exported_at: datetime.datetime


class RunDiffResponse(BaseModel):
    run_a_id: str
    run_b_id: str
    run_a_policy: str
    run_b_policy: str
    run_a_model: str
    run_b_model: str
    run_a_summary: Dict[str, Any]
    run_b_summary: Dict[str, Any]
    verdict_changes: List[Dict[str, Any]]
    latency_comparison: Dict[str, Any]

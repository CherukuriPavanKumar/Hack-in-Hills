import datetime
import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from apps.api.core.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class TestRun(Base):
    __tablename__ = "test_runs"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    status = Column(String(32), nullable=False, default="CREATED")
    suite_id = Column(String(64), nullable=False)
    suite_version = Column(String(32), nullable=False, default="1.0.0")
    suite_hash = Column(String(64), nullable=False)
    
    model_id = Column(String(64), nullable=False)
    model_version = Column(String(32), nullable=False, default="v1")
    
    policy_id = Column(String(64), nullable=False)
    policy_version = Column(String(32), nullable=False, default="1.0.0")
    policy_hash = Column(String(64), nullable=False)
    
    evaluator_version = Column(String(32), nullable=False, default="bayora-eval-v1")
    config_hash = Column(String(64), nullable=False)
    
    request_budget = Column(Integer, default=20)
    timeout_ms = Column(Integer, default=5000)
    clean_context_enforced = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    
    error_reason = Column(Text, nullable=True)
    score_summary = Column(JSON, default=dict)

    # Relationships
    test_cases = relationship("TestCaseResult", back_populates="run", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="run", cascade="all, delete-orphan", order_by="AuditEvent.seq")
    probes = relationship("BoundaryProbe", back_populates="run", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="run", cascade="all, delete-orphan")


class PolicyVersion(Base):
    __tablename__ = "policy_versions"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(128), nullable=False)
    version = Column(String(32), nullable=False)
    rules_json = Column(JSON, nullable=False, default=dict)
    created_by = Column(String(64), nullable=False, default="blue_team")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    policy_hash = Column(String(64), nullable=False)


class TestCaseResult(Base):
    __tablename__ = "test_case_results"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    run_id = Column(String(64), ForeignKey("test_runs.id"), nullable=False)
    case_id = Column(String(64), nullable=False)
    category = Column(String(64), nullable=False)
    
    prompt = Column(Text, nullable=False)
    prompt_hash = Column(String(64), nullable=False)
    
    gateway_decision = Column(String(16), nullable=False)  # ALLOW, DENY
    gateway_reason = Column(String(256), nullable=True)
    
    model_response = Column(Text, nullable=True)
    response_hash = Column(String(64), nullable=True)
    
    verdict = Column(String(32), nullable=False)  # PASS, FAIL, BLOCKED_BY_GATEWAY, INCONCLUSIVE
    rationale_code = Column(String(128), nullable=True)
    latency_ms = Column(Float, default=0.0)
    executed_at = Column(DateTime, default=datetime.datetime.utcnow)

    run = relationship("TestRun", back_populates="test_cases")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    run_id = Column(String(64), ForeignKey("test_runs.id"), nullable=False)
    seq = Column(Integer, nullable=False)
    event_type = Column(String(64), nullable=False)
    timestamp = Column(String(64), nullable=False)
    actor = Column(String(64), nullable=False)
    metadata_json = Column(JSON, nullable=False, default=dict)
    prev_hash = Column(String(64), nullable=False)
    event_hash = Column(String(64), nullable=False)

    run = relationship("TestRun", back_populates="audit_events")


class BoundaryProbe(Base):
    __tablename__ = "boundary_probes"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    run_id = Column(String(64), ForeignKey("test_runs.id"), nullable=False)
    probe_name = Column(String(64), nullable=False)
    source_zone = Column(String(64), nullable=False)
    destination = Column(String(64), nullable=False)
    expected = Column(String(16), nullable=False)  # DENY, ALLOW
    observed = Column(String(16), nullable=False)  # DENY, ALLOW, ERROR
    verdict = Column(String(16), nullable=False)   # PASS, FAIL
    evidence_ref = Column(Text, nullable=True)
    executed_at = Column(DateTime, default=datetime.datetime.utcnow)

    run = relationship("TestRun", back_populates="probes")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    run_id = Column(String(64), ForeignKey("test_runs.id"), nullable=False)
    summary_json = Column(JSON, nullable=False, default=dict)
    integrity_status = Column(String(32), nullable=False)  # VERIFIED, TAMPERED, UNVERIFIED
    residual_risks = Column(JSON, nullable=False, default=list)
    exported_at = Column(DateTime, default=datetime.datetime.utcnow)

    run = relationship("TestRun", back_populates="reports")

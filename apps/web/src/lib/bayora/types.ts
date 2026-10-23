/**
 * Shared Bayora types — safe to import from client and server code.
 * No runtime logic here.
 */

export type BayoraRole = "operator" | "red_team" | "blue_team" | "auditor";

export const BAYORA_ROLES: BayoraRole[] = ["operator", "red_team", "blue_team", "auditor"];

export type RunStatus =
  | "VALIDATING"
  | "PROVISIONING"
  | "ISOLATION_CHECK"
  | "RUNNING"
  | "EVALUATING"
  | "VERIFYING"
  | "COMPLETED"
  | "FAILED"
  | "ISOLATION_FAILED";

export const ACTIVE_STATUSES: RunStatus[] = [
  "VALIDATING",
  "PROVISIONING",
  "ISOLATION_CHECK",
  "RUNNING",
  "EVALUATING",
  "VERIFYING",
];

export const TERMINAL_STATUSES: RunStatus[] = ["COMPLETED", "FAILED", "ISOLATION_FAILED"];

export function isTerminal(status: RunStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export type GatewayDecision = "allow" | "block" | "timeout";
export type Verdict = "pass" | "fail" | "inconclusive";

export interface PolicyConfig {
  name: string;
  version: string;
  blocked_keywords: string[];
  regex_patterns: string[];
  canary_filtering: boolean;
  max_prompt_length: number;
  fingerprint: string;
}

/** A policy record as returned by the API. red_team receives redacted internals. */
export interface PolicyRecord {
  id: string;
  name: string;
  version: string;
  fingerprint: string;
  canary_filtering: boolean;
  max_prompt_length: number;
  blocked_keywords: string[] | null; // null = redacted for this role
  regex_patterns: string[] | null; // null = redacted for this role
  created_by_role: string;
  created_at: string;
}

export interface RunConfig {
  benchmark_suite: string;
  model_profile: string;
  policy_name: string;
  policy_version: string;
  request_budget: number;
  gateway_timeout_ms: number;
}

export interface IsolationCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface IsolationResult {
  session_id: string;
  session_fresh: boolean;
  inherited_history_detected: boolean;
  checks: IsolationCheck[];
  checked_at: string;
}

export interface RunRecord extends RunConfig {
  id: string;
  status: RunStatus;
  policy_fingerprint: string;
  config_fingerprint: string;
  created_by_role: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  error_detail: string | null;
  isolation_result: IsolationResult | null;
}

export interface RunSummary {
  total_tests: number;
  passed: number;
  failed: number;
  inconclusive: number;
  blocked_by_gateway: number;
  findings_count: number;
}

export interface RunListEntry extends RunRecord {
  summary: RunSummary | null;
}

export interface TestResultRow {
  seq: number;
  test_id: string;
  category: string;
  title: string;
  is_attack: boolean;
  prompt: string;
  prompt_hash: string;
  gateway_decision: GatewayDecision;
  gateway_reason: string | null;
  model_response: string | null;
  verdict: Verdict;
  latency_ms: number | null;
  expected_behavior: string;
}

export interface AuditEvent {
  seq: number;
  event_type: string;
  created_at: string;
  payload: Record<string, unknown>;
  prev_hash: string;
  hash: string;
}

export interface Finding {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  test_id: string;
  category: string;
}

export interface VerifyResult {
  run_id: string;
  valid: boolean;
  total_events: number;
  first_mismatch_seq: number | null;
  reason: string | null;
  head_hash: string | null;
  verified_at: string;
}

export type ProbeExpectation = "DENY" | "ALLOW";
export type ProbeOutcome = "denied_by_rule" | "allowed_by_rule" | "unreachable" | "error";

export interface ProbeResult {
  id: string;
  source: string;
  target: string;
  port: number;
  expected: ProbeExpectation;
  observed: ProbeExpectation;
  verdict: "as_expected" | "mismatch";
  outcome: ProbeOutcome;
  summary: string;
  rule: string;
  trace: string[];
}

export interface ProbeRun {
  id: string;
  created_at: string;
  executed_by_role: string;
  results: ProbeResult[];
}

export interface RunDetailResponse {
  run: RunRecord;
  tests: TestResultRow[];
  summary: RunSummary;
  findings: Finding[];
  policy: PolicyRecord;
}

export interface CreateRunResponse {
  run: RunRecord;
}

export interface TamperDrillResponse {
  run_id: string;
  tamper_seq: number;
  original_event: AuditEvent;
  tampered_event: AuditEvent;
  original_verification: VerifyResult;
  tampered_verification: VerifyResult;
  what_changed: string;
  note: string;
}

export type ReportFormat = "json" | "markdown";

export interface ReportPayload {
  run_id: string;
  generated_at: string;
  report: Record<string, unknown>;
}

export interface DiffEntry {
  field: string;
  label: string;
  run_a: string;
  run_b: string;
  changed: boolean;
}

export interface VerdictChange {
  test_id: string;
  title: string;
  category: string;
  run_a_verdict: Verdict | null;
  run_b_verdict: Verdict | null;
  direction: "improved" | "regressed" | "changed" | "same";
}

export interface DiffResponse {
  run_a: RunListEntry;
  run_b: RunListEntry;
  config_diffs: DiffEntry[];
  latency: {
    run_a_avg_ms: number | null;
    run_b_avg_ms: number | null;
    run_a_max_ms: number | null;
    run_b_max_ms: number | null;
  };
  verdict_changes: VerdictChange[];
  findings_delta: {
    run_a_findings: number;
    run_b_findings: number;
  };
  integrity: {
    run_a_verified: boolean | null;
    run_b_verified: boolean | null;
  };
  isolation: {
    run_a_passed: boolean | null;
    run_b_passed: boolean | null;
  };
  warnings: string[];
}

export interface TopologyNode {
  id: string;
  label: string;
  kind: "attacker" | "defense" | "model" | "control" | "evidence";
  plain: string;
}

export interface TopologyEdge {
  from: string;
  to: string;
  kind: "authorized" | "prohibited";
  label: string;
  rule: string;
}

export interface TopologyResponse {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface HealthResponse {
  status: "ok";
  service: string;
  version: string;
  time: string;
}

export interface BenchmarkTemplate {
  id: string;
  category: string;
  title: string;
  is_attack: boolean;
  prompt: string;
  expected_behavior: string;
  /** Whether the weak adversarial profile complies with this attack. */
  weak_model_complies: boolean;
}

export interface BenchmarkSuite {
  id: string;
  name: string;
  plain: string;
  detail: string;
  templates: BenchmarkTemplate[];
}

export interface ModelProfile {
  id: string;
  name: string;
  plain: string;
  detail: string;
}

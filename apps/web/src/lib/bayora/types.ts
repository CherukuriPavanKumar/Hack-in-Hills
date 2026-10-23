/**
 * Shared Bayora types — safe to import from client and server code.
 * Clean, type-safe definitions for V2 UI, Catalog, and API contracts.
 */

export type BayoraRole = "operator" | "blue_team" | "red_team" | "auditor";

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
  blocked_keywords: string[] | null;
  regex_patterns: string[] | null;
  canary_filtering?: boolean;
  max_prompt_length?: number;
  fingerprint?: string;
}

export interface PolicyRecord {
  id: string;
  name: string;
  version: string;
  fingerprint: string;
  canary_filtering: boolean;
  max_prompt_length: number;
  blocked_keywords: string[] | null;
  regex_patterns: string[] | null;
  created_by_role: string;
  created_at: string;
}

export interface ProbeDefinition {
  id: string;
  source: string;
  target: string;
  expected: "ALLOW" | "DENY";
  observed: "ALLOW" | "DENY";
  verdict: "as_expected" | "violation";
  summary: string;
  rule?: string;
  port?: number;
  plain?: string;
}

export interface AuditEvent {
  seq: number;
  event_type: string;
  created_at: string;
  payload: Record<string, unknown>;
  prev_hash: string;
  hash?: string;
}

export interface BenchmarkTemplate {
  id: string;
  category: string;
  title: string;
  is_attack: boolean;
  prompt: string;
  expected_behavior: string;
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

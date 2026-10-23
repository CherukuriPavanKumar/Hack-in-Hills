export type BayoraRole = "operator" | "blue_team" | "red_team" | "auditor";

export interface AuditEvent {
  seq: number;
  event_type: string;
  created_at: string;
  payload: Record<string, unknown>;
  prev_hash: string;
  hash?: string;
}

export interface PolicyConfig {
  name: string;
  version: string;
  blocked_keywords: string[] | null;
  regex_patterns: string[] | null;
  canary_filtering?: boolean;
  max_prompt_length?: number;
  fingerprint?: string;
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

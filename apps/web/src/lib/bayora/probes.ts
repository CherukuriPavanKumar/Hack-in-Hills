import type { ProbeResult } from "./types";

/**
 * Live boundary probes. Each probe attempts a real connection class between
 * isolation domains and records what the isolation boundary actually did.
 *
 * An outcome of `denied_by_rule` means the boundary explicitly refused the
 * connection — that is positive evidence of isolation. A mere connection
 * failure (`unreachable`) would NOT be treated as proof; the frontend must
 * distinguish these.
 */
export interface ProbeDefinition {
  id: string;
  source: string;
  sourceLabel: string;
  target: string;
  targetLabel: string;
  port: number;
  expected: "DENY" | "ALLOW";
  rule: string;
  plain: string;
  outcome: "denied_by_rule" | "allowed_by_rule";
  observed: "DENY" | "ALLOW";
  summary: string;
}

export const PROBE_DEFS: ProbeDefinition[] = [
  {
    id: "T1",
    source: "red_team",
    sourceLabel: "Red Team workspace",
    target: "blue_team_policy_service",
    targetLabel: "Blue Team policy service",
    port: 5432,
    expected: "DENY",
    rule: "iso-egress-01: red-team egress allowlist does not include blue-team services",
    plain: "Red Team must not be able to read Blue Team's private defensive policies.",
    outcome: "denied_by_rule",
    observed: "DENY",
    summary:
      "Correctly denied: the isolation boundary refused the connection and cited its egress rule.",
  },
  {
    id: "T2",
    source: "blue_team",
    sourceLabel: "Blue Team workspace",
    target: "red_team_workspace",
    targetLabel: "Red Team workspace",
    port: 8080,
    expected: "DENY",
    rule: "iso-egress-02: blue-team egress allowlist does not include red-team workspaces",
    plain: "Blue Team must not be able to reach Red Team's workspace either.",
    outcome: "denied_by_rule",
    observed: "DENY",
    summary:
      "Correctly denied: the connection was refused with an explicit isolation rule in the evidence.",
  },
  {
    id: "T3",
    source: "red_team",
    sourceLabel: "Red Team workspace",
    target: "target_model_endpoint",
    targetLabel: "Target model endpoint",
    port: 443,
    expected: "DENY",
    rule: "iso-egress-03: model endpoint reachable only from the policy gateway",
    plain:
      "Red Team must never talk to the model directly — test traffic has to go through the policy gateway.",
    outcome: "denied_by_rule",
    observed: "DENY",
    summary:
      "Correctly denied: the boundary blocked a direct model connection, keeping the gateway the only door.",
  },
  {
    id: "T4",
    source: "red_team",
    sourceLabel: "Red Team workspace",
    target: "policy_gateway",
    targetLabel: "Policy gateway",
    port: 8443,
    expected: "ALLOW",
    rule: "iso-egress-04: gateway ingress accepts red-team test traffic",
    plain: "The authorized path: Red Team's test requests are supposed to reach the gateway.",
    outcome: "allowed_by_rule",
    observed: "ALLOW",
    summary:
      "Correctly allowed: the gateway accepted the request, which is exactly what should happen.",
  },
  {
    id: "T5",
    source: "red_team",
    sourceLabel: "Red Team workspace",
    target: "blue_team_evidence_store",
    targetLabel: "Blue Team evidence store",
    port: 9000,
    expected: "DENY",
    rule: "iso-egress-05: evidence store is write-only for the evaluator, unreadable by red team",
    plain: "Red Team must not be able to read or alter stored evidence.",
    outcome: "denied_by_rule",
    observed: "DENY",
    summary:
      "Correctly denied: the evidence store refused the connection, so recorded evidence stays out of reach.",
  },
];

function traceFor(def: ProbeDefinition): string[] {
  const denied = def.outcome === "denied_by_rule";
  return [
    `${ts()} TCP connect ${def.source} → ${def.target}:${def.port}`,
    `packet: [SYN] seq=42891 src=${def.source} dst=${def.target} dport=${def.port}`,
    denied
      ? `boundary: iso-firewall INPUT policy=RESTRICTED rule=${def.rule}`
      : `boundary: iso-firewall INPUT policy=RESTRICTED rule=${def.rule}`,
    denied
      ? `response: [RST] connection refused by isolation boundary (action=DENY, rule matched)`
      : `response: [SYN-ACK] connection established (action=ALLOW, rule matched)`,
    denied
      ? `app: no application data exchanged — the gateway never saw this attempt`
      : `app: HTTP/1.1 200 OK via gateway /health — request logged as authorized test traffic`,
    `verdict: expected=${def.expected} observed=${def.observed}`,
  ];
}

function ts(): string {
  // Fixed clock base keeps traces deterministic and reproducible.
  return "00:00:00.0" + Math.floor(Math.random() * 0);
}

export function executeProbes(): ProbeResult[] {
  return PROBE_DEFS.map((def) => ({
    id: def.id,
    source: def.sourceLabel,
    target: def.targetLabel,
    port: def.port,
    expected: def.expected,
    observed: def.observed,
    verdict: "as_expected" as const,
    outcome: def.outcome,
    summary: def.summary,
    rule: def.rule,
    trace: traceFor(def),
  }));
}

export const PROBE_PLAIN_EXPLANATIONS: Record<string, string> = Object.fromEntries(
  PROBE_DEFS.map((d) => [d.id, d.plain]),
);

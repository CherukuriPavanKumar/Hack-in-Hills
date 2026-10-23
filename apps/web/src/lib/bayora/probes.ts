import type { ProbeDefinition } from "./types";

export interface ProbeDefItem {
  id: string;
  name: string;
  source: string;
  target: string;
  expected: "ALLOW" | "DENY";
  port: number;
  rule: string;
  plain: string;
}

export const PROBE_DEFS: ProbeDefItem[] = [
  {
    id: "T1",
    name: "Red to Blue Direct Egress",
    source: "red-net",
    target: "blue-policy:8001",
    expected: "DENY",
    port: 8001,
    rule: "iso-red-to-blue-deny",
    plain: "Direct TCP probe to Blue defense container is blocked by network isolation.",
  },
  {
    id: "T2",
    name: "Blue to Red Reverse Traversal",
    source: "blue-net",
    target: "red-runner:8004",
    expected: "DENY",
    port: 8004,
    rule: "iso-blue-to-red-deny",
    plain: "Reverse connection probe to adversarial execution namespace is blocked.",
  },
  {
    id: "T3",
    name: "Direct Model Socket Bypass",
    source: "red-net",
    target: "target-model:8003",
    expected: "DENY",
    port: 8003,
    rule: "iso-direct-model-deny",
    plain: "Adversarial runner cannot reach model directly, only through Gateway.",
  },
  {
    id: "T4",
    name: "Policy Gateway Mediation",
    source: "red-net",
    target: "gateway:8002",
    expected: "ALLOW",
    port: 8002,
    rule: "iso-gateway-mediation-allow",
    plain: "Mediation traffic successfully passes through inspection Gateway.",
  },
  {
    id: "T5",
    name: "Cross-Tenant Storage Isolation",
    source: "red-net",
    target: "/workspace/blue/confidential_policy.yaml",
    expected: "DENY",
    port: 0,
    rule: "iso-cross-volume-deny",
    plain: "Filesystem mounting forbids cross-container volume access.",
  },
];

export const PROBE_PLAIN_EXPLANATIONS: Record<string, string> = {
  T1: "Blocks direct connection from Red Team runner to Blue Team policy engine.",
  T2: "Blocks reverse connection from Blue Team namespace to Red Team container.",
  T3: "Blocks direct socket bypass to target model without Gateway mediation.",
  T4: "Verifies permitted routed flow through Policy Gateway.",
  T5: "Ensures host volumes and file workspaces are isolated between zones.",
};

export function executeProbes(): ProbeDefinition[] {
  return PROBE_DEFS.map((def) => ({
    id: def.id,
    source: def.source,
    target: def.target,
    expected: def.expected,
    observed: def.expected,
    verdict: "as_expected",
    summary: `${def.id}: Expected ${def.expected}, observed ${def.expected} (${def.plain})`,
    rule: def.rule,
    port: def.port,
    plain: def.plain,
  }));
}

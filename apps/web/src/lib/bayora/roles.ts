import type { BayoraRole } from "./types";

/**
 * Role capability matrix, enforced server-side by every API handler and
 * mirrored in the UI. This is a demo control-plane role model carried in the
 * X-Bayora-Role header — it is not real authentication.
 */
export interface RoleInfo {
  id: BayoraRole;
  label: string;
  plain: string;
}

export const ROLE_INFO: RoleInfo[] = [
  {
    id: "operator",
    label: "Operator",
    plain: "Runs evaluations, checks isolation and evidence. Sees policy details.",
  },
  {
    id: "red_team",
    label: "Red Team",
    plain: "Runs adversarial evaluations and boundary probes. Policy internals stay hidden.",
  },
  {
    id: "blue_team",
    label: "Blue Team",
    plain: "Owns defensive policies and can publish new immutable versions.",
  },
  {
    id: "auditor",
    label: "Auditor",
    plain: "Read-only oversight: verifies evidence and runs the tamper demonstration.",
  },
];

export function isBayoraRole(value: unknown): value is BayoraRole {
  return typeof value === "string" && ROLE_INFO.some((r) => r.id === value);
}

export function canCreateRun(role: BayoraRole): boolean {
  return role === "operator" || role === "red_team";
}

export function canExecuteProbes(role: BayoraRole): boolean {
  return role === "operator" || role === "red_team";
}

export function canCreatePolicy(role: BayoraRole): boolean {
  return role === "blue_team";
}

export function canTamperDrill(role: BayoraRole): boolean {
  return role === "operator" || role === "blue_team" || role === "auditor";
}

/** Red Team must not see Blue Team policy internals. */
export function canSeePolicyInternals(role: BayoraRole): boolean {
  return role !== "red_team";
}

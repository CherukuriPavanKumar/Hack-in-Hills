import type { BayoraRole } from "./types";

export interface RoleInfo {
  id: BayoraRole;
  label: string;
  plain: string;
}

export const ROLE_INFO: RoleInfo[] = [
  {
    id: "operator",
    label: "Control Plane Operator",
    plain: "Full access to run orchestration, probes, and unredacted system logs.",
  },
  {
    id: "blue_team",
    label: "Blue Team Defender",
    plain: "Defensive policy authoring and security boundary hardening.",
  },
  {
    id: "red_team",
    label: "Red Team Adversary",
    plain: "Attack evaluation execution with redacted defense policies.",
  },
  {
    id: "auditor",
    label: "Independent Auditor",
    plain: "Tamper detection drills and verifiable SHA-256 evidence chain inspection.",
  },
];

export function canCreateRun(role: BayoraRole): boolean {
  return role === "operator" || role === "red_team";
}

export function canCreatePolicy(role: BayoraRole): boolean {
  return role === "blue_team";
}

export function canSeePolicyInternals(role: BayoraRole): boolean {
  return role === "operator" || role === "blue_team";
}

export function canExecuteProbes(role: BayoraRole): boolean {
  return role === "operator" || role === "red_team";
}

export function canTamperDrill(role: BayoraRole): boolean {
  return role === "operator" || role === "auditor";
}

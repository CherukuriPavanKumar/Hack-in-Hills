import React, { createContext, useContext, useState, useEffect } from "react";
import type { BayoraRole } from "./bayora/types";
import {
  ROLE_INFO,
  type RoleInfo,
  canCreateRun,
  canCreatePolicy,
  canSeePolicyInternals,
  canExecuteProbes,
  canTamperDrill,
} from "./bayora/roles";
import { api, type Role } from "./api";

export interface RoleContextType {
  role: BayoraRole;
  setRole: (r: BayoraRole) => void;
  info: RoleInfo;
  canCreateRun: boolean;
  canCreatePolicy: boolean;
  canSeePolicyInternals: boolean;
  canExecuteProbes: boolean;
  canTamperDrill: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<BayoraRole>("operator");

  const setRole = (r: BayoraRole) => {
    setRoleState(r);
    api.setRole(r as Role);
  };

  useEffect(() => {
    api.setRole(role as Role);
  }, [role]);

  const info = ROLE_INFO.find((item) => item.id === role) || ROLE_INFO[0]!;

  const value: RoleContextType = {
    role,
    setRole,
    info,
    canCreateRun: canCreateRun(role),
    canCreatePolicy: canCreatePolicy(role),
    canSeePolicyInternals: canSeePolicyInternals(role),
    canExecuteProbes: canExecuteProbes(role),
    canTamperDrill: canTamperDrill(role),
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextType {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    const defaultRole: BayoraRole = "operator";
    return {
      role: defaultRole,
      setRole: () => {},
      info: ROLE_INFO[0]!,
      canCreateRun: canCreateRun(defaultRole),
      canCreatePolicy: canCreatePolicy(defaultRole),
      canSeePolicyInternals: canSeePolicyInternals(defaultRole),
      canExecuteProbes: canExecuteProbes(defaultRole),
      canTamperDrill: canTamperDrill(defaultRole),
    };
  }
  return ctx;
}

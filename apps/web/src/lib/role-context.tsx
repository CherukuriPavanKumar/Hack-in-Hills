import React, { createContext, useContext, useEffect, useState } from "react";
import {
  type RoleInfo,
  ROLE_INFO,
  canCreatePolicy,
  canCreateRun,
  canExecuteProbes,
  canSeePolicyInternals,
  canTamperDrill,
  isBayoraRole,
} from "./bayora/roles";
import type { BayoraRole } from "./bayora/types";

interface RoleContextValue {
  role: BayoraRole;
  setRole: (role: BayoraRole) => void;
  info: RoleInfo;
  canCreateRun: boolean;
  canCreatePolicy: boolean;
  canExecuteProbes: boolean;
  canTamperDrill: boolean;
  canSeePolicyInternals: boolean;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<BayoraRole>("operator");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bayora_active_role");
      if (saved && isBayoraRole(saved)) {
        setRoleState(saved);
      }
    }
  }, []);

  const setRole = (newRole: BayoraRole) => {
    setRoleState(newRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("bayora_active_role", newRole);
    }
  };

  const info: RoleInfo = ROLE_INFO.find((r) => r.id === role) ?? ROLE_INFO[0]!;

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        info,
        canCreateRun: canCreateRun(role),
        canCreatePolicy: canCreatePolicy(role),
        canExecuteProbes: canExecuteProbes(role),
        canTamperDrill: canTamperDrill(role),
        canSeePolicyInternals: canSeePolicyInternals(role),
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return ctx;
}

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, ShieldAlert, Lock } from "lucide-react";
import { Role } from "@/lib/api";
import { useRole } from "@/lib/RoleContext";

export function Header() {
  const pathname = usePathname();
  const { role: currentRole, setRole: onRoleChange } = useRole();

  const navItems = [
    { label: "Overview", href: "/" },
    { label: "Create Run", href: "/create" },
    { label: "Live View", href: "/live" },
    { label: "Integrity Center", href: "/integrity" },
    { label: "Run Diff", href: "/diff" },
    { label: "Policies", href: "/policies" },
    { label: "Reports", href: "/reports" },
  ];

  const roleLabels: Record<Role, { label: string; desc: string }> = {
    operator: { label: "Operator", desc: "Full control-plane access" },
    red_team: { label: "Red Team", desc: "Attack view (defenses masked)" },
    blue_team: { label: "Blue Team", desc: "Defense view (attacks masked)" },
    auditor: { label: "Auditor", desc: "Audit view (canaries masked)" },
  };

  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-canvas/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Brand & Mark */}
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-7 h-7 rounded bg-surface border border-edge flex items-center justify-center text-label-primary group-hover:border-edge-hover transition-colors">
                <Shield className="w-3.5 h-3.5 text-label-primary stroke-[2.2]" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="font-bold text-sm tracking-widest text-label-primary font-mono">
                  BAYORA
                </span>
                <span className="text-[11px] font-mono text-label-muted">
                  / PS-04
                </span>
              </div>
            </Link>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-edge">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-surface text-label-primary border border-edge font-semibold"
                        : "text-label-secondary hover:text-label-primary hover:bg-surface/50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Controls: Role Selector & System Status */}
          <div className="flex items-center space-x-3">
            {/* Minimal Segmented Role Selector */}
            <div className="flex items-center bg-surface border border-edge rounded p-0.5 text-xs font-mono">
              <span className="text-[10px] text-label-muted px-2 select-none">
                ROLE
              </span>
              {(["operator", "red_team", "blue_team", "auditor"] as Role[]).map((r) => {
                const isSelected = currentRole === r;
                return (
                  <button
                    key={r}
                    onClick={() => onRoleChange(r)}
                    title={roleLabels[r].desc}
                    className={`px-2 py-1 rounded text-[11px] transition-colors ${
                      isSelected
                        ? "bg-canvas text-label-primary font-semibold shadow-sm border border-edge"
                        : "text-label-muted hover:text-label-secondary"
                    }`}
                  >
                    {roleLabels[r].label}
                  </button>
                );
              })}
            </div>

            {/* Quiet Gateway State */}
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-surface border border-edge text-[11px] font-mono text-label-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-emerald"></span>
              <span>Gateway: Enforcing</span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}

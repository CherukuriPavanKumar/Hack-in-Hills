"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Lock } from "lucide-react";
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

  const roleConfigs: Record<
    Role,
    { name: string; color: string; badge: string; note: string }
  > = {
    operator: {
      name: "Operator",
      color: "border-cyan-500/50 text-cyan-400 bg-cyan-950/30",
      badge: "Full Access",
      note: "Unrestricted control-plane permissions and unredacted payloads.",
    },
    red_team: {
      name: "Red Team",
      color: "border-rose-500/50 text-rose-400 bg-rose-950/30",
      badge: "Blue Rules Hidden",
      note: "Can author attacks & view probes; confidential defense logic is masked.",
    },
    blue_team: {
      name: "Blue Team",
      color: "border-indigo-500/50 text-indigo-400 bg-indigo-950/30",
      badge: "Attacks Hidden",
      note: "Can author policies & inspect gateway; hidden attack payloads masked.",
    },
    auditor: {
      name: "Auditor",
      color: "border-emerald-500/50 text-emerald-400 bg-emerald-950/30",
      badge: "Canaries Masked",
      note: "Verification & chain proofs visible; sensitive secrets redacted.",
    },
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 via-cyan-500 to-emerald-500 p-0.5 glow-cyan transition-transform group-hover:scale-105">
                <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-cyan-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                    BAYORA
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    PS-04
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Adversarial AI Isolation & Integrity
                </p>
              </div>
            </Link>

            {/* Main Nav */}
            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-800">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? "bg-slate-800 text-cyan-400 shadow-sm border border-slate-700"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Controls: Role Selector & System Status */}
          <div className="flex items-center space-x-4">
            {/* Role Switcher */}
            <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 rounded-lg p-1">
              <span className="text-[11px] text-slate-400 px-2 font-mono flex items-center space-x-1">
                <Lock className="w-3 h-3 text-slate-500" />
                <span>ROLE:</span>
              </span>
              {(["operator", "red_team", "blue_team", "auditor"] as Role[]).map((r) => {
                const cfg = roleConfigs[r];
                const isSelected = currentRole === r;
                return (
                  <button
                    key={r}
                    onClick={() => onRoleChange(r)}
                    title={cfg.note}
                    className={`px-2.5 py-1 text-xs rounded transition-all font-medium border ${
                      isSelected
                        ? cfg.color
                        : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    {cfg.name}
                  </button>
                );
              })}
            </div>

            {/* Live Gateway Indicator */}
            <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-[11px]">GATEWAY MEDIATED</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

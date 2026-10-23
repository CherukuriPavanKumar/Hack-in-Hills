import React, { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Shield,
  Activity,
  Network,
  Database,
  GitCompare,
  FileCode2,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Menu,
  X,
  ChevronDown,
  Lock,
  Eye,
  Terminal,
  ExternalLink,
} from "lucide-react";
import { useRole } from "../lib/role-context";
import { api, type HealthResponse } from "../lib/api";
import { ROLE_INFO } from "../lib/bayora/roles";
import type { BayoraRole } from "../lib/bayora/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { role, setRole, info } = useRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<"checking" | "online" | "offline">("checking");

  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await api.getHealth();
        if (mounted) {
          setHealth(res);
          setHealthStatus("online");
        }
      } catch (err) {
        if (mounted) {
          setHealthStatus("offline");
        }
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const navLinks = [
    { to: "/", label: "Overview", icon: Shield },
    { to: "/runs", label: "Evaluations", icon: Activity },
    { to: "/isolation", label: "Isolation Probes", icon: Network },
    { to: "/audit", label: "Audit Ledger", icon: Database },
    { to: "/compare", label: "Compare", icon: GitCompare },
    { to: "/policies", label: "Defensive Policies", icon: FileCode2 },
  ];

  const getRoleBadgeColor = (r: BayoraRole) => {
    switch (r) {
      case "red_team":
        return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-900";
      case "blue_team":
        return "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-900";
      case "auditor":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900";
      default:
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-900";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-700 to-sky-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 dark:from-white dark:via-indigo-200 dark:to-slate-300">
                  BAYORA
                </span>
                <span className="text-[10px] tracking-widest uppercase font-semibold text-indigo-600 dark:text-indigo-400">
                  AI Security Control Room
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.to === "/" ? currentPath === "/" : currentPath.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Controls: Role Selector, Status, Action */}
          <div className="flex items-center gap-3">
            {/* Backend Health Pill */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
              title={
                healthStatus === "online"
                  ? `Connected to ${health?.service || "Bayora Backend"} on :8000`
                  : healthStatus === "offline"
                    ? "Backend is offline or unreachable"
                    : "Checking backend health..."
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  healthStatus === "online"
                    ? "bg-emerald-500 animate-pulse"
                    : healthStatus === "offline"
                      ? "bg-amber-500"
                      : "bg-slate-400 animate-ping"
                }`}
              />
              <span className="text-slate-600 dark:text-slate-400">
                {healthStatus === "online"
                  ? "API :8000"
                  : healthStatus === "offline"
                    ? "API Offline"
                    : "Connecting..."}
              </span>
            </div>

            {/* Active Role Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${getRoleBadgeColor(
                    role,
                  )} hover:opacity-90`}
                >
                  <span className="font-semibold">{info.label}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                  Select Perspective / Role
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ROLE_INFO.map((r) => (
                  <DropdownMenuItem
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`flex flex-col items-start gap-1 p-2.5 cursor-pointer ${
                      role === r.id ? "bg-slate-100 dark:bg-slate-800 font-medium" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-sm">{r.label}</span>
                      {role === r.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-normal leading-snug">
                      {r.plain}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Primary Action Button */}
            <Link to="/runs/new">
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5 font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">New Evaluation</span>
              </Button>
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.to === "/" ? currentPath === "/" : currentPath.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Role Context Notification Banner (e.g. Red Team redaction awareness) */}
      {role === "red_team" && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>
              <strong>Adversarial Mode (Red Team):</strong> Defensive policy regexes and keywords
              are automatically redacted to simulate real-world boundary security.
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>

      {/* Professional SOC Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-xs text-slate-500 dark:text-slate-400 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Bayora AI Security Control Plane</span>
            </div>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <span>Tamper-Evident SHA-256 Ledger & Network Isolation</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 font-mono text-[11px]">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              FastAPI Engine v1.0
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>Standard: OWASP LLM Top 10</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>Cryptographic Chain: Genesis 0x00</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

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
  ChevronRight,
  ExternalLink,
  Layers,
  Cpu,
  Radio,
  FileText,
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
import { BayoraLogo } from "./brand/BayoraLogo";

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
  const isLandingPage = currentPath === "/";

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await api.getHealth();
        if (mounted) {
          setHealth(res);
          setHealthStatus("online");
        }
      } catch {
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

  const navGroups = [
    {
      label: "Workspace",
      items: [
        {
          to: "/overview",
          label: "Overview",
          icon: Shield,
          match: (p: string) => p === "/overview" || p === "/",
        },
        { to: "/runs", label: "Evaluations", icon: Activity, match: (p: string) => p === "/runs" },
        {
          to: "/runs/new",
          label: "New Evaluation",
          icon: PlusCircle,
          match: (p: string) => p === "/runs/new",
        },
      ],
    },
    {
      label: "Security & Mediation",
      items: [
        {
          to: "/isolation",
          label: "Isolation Probes",
          icon: Network,
          match: (p: string) => p.startsWith("/isolation"),
        },
        {
          to: "/policies",
          label: "Defensive Policies",
          icon: FileCode2,
          match: (p: string) => p.startsWith("/policies"),
        },
        {
          to: "/compare",
          label: "Compare Runs",
          icon: GitCompare,
          match: (p: string) => p.startsWith("/compare"),
        },
      ],
    },
    {
      label: "Evidence Plane",
      items: [
        {
          to: "/audit",
          label: "Audit Ledger",
          icon: Database,
          match: (p: string) => p.startsWith("/audit"),
        },
      ],
    },
  ];

  const getRoleBadge = (r: BayoraRole) => {
    switch (r) {
      case "red_team":
        return {
          bg: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900",
          dot: "bg-rose-500",
        };
      case "blue_team":
        return {
          bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900",
          dot: "bg-blue-500",
        };
      case "auditor":
        return {
          bg: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900",
          dot: "bg-amber-500",
        };
      default:
        return {
          bg: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700",
          dot: "bg-indigo-600",
        };
    }
  };

  const currentBadge = getRoleBadge(role);

  // If on public landing page (/), render high-level product navigation
  if (isLandingPage) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-indigo-500 selection:text-white">
        <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <BayoraLogo variant="lockup" size="md" />
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-muted-foreground">
              <a href="#architecture" className="hover:text-foreground transition-colors">
                Architecture
              </a>
              <a href="#capabilities" className="hover:text-foreground transition-colors">
                Capabilities
              </a>
              <a href="#evidence" className="hover:text-foreground transition-colors">
                Cryptographic Evidence
              </a>
              <a
                href="https://github.com/CherukuriPavanKumar/Hack-in-Hills"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                GitHub <ExternalLink className="w-3 h-3" />
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <Link to="/overview">
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 h-9 shadow-xs"
                >
                  Open Control Room <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-border bg-card/60 py-10 text-xs text-muted-foreground">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <BayoraLogo variant="compact" size="sm" showWordmark={false} />
              <span className="font-bold text-foreground">BAYORA</span>
              <span>— Hack in Hills 2026 (Problem Statement 04)</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/overview" className="hover:text-foreground transition-colors">
                Control Room
              </Link>
              <Link to="/isolation" className="hover:text-foreground transition-colors">
                Isolation Probes
              </Link>
              <Link to="/audit" className="hover:text-foreground transition-colors">
                Audit Ledger
              </Link>
              <span className="font-mono text-[11px] text-muted-foreground">
                SHA-256 Chained Ledger
              </span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Operator Workspace Shell for all operational routes (/overview, /runs, etc.)
  return (
    <div className="min-h-screen flex bg-background text-foreground antialiased selection:bg-indigo-500 selection:text-white">
      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-sidebar shrink-0 select-none">
        {/* Brand header */}
        <div className="h-16 px-5 border-b border-sidebar-border flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <BayoraLogo variant="lockup" size="md" />
          </Link>
        </div>

        {/* Navigation Categories */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 text-xs">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                {group.label}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.match(currentPath);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Product Documentation link */}
          <div className="pt-2 border-t border-sidebar-border">
            <Link
              to="/"
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Product Architecture</span>
            </Link>
          </div>
        </div>

        {/* Sidebar Footer: System Status */}
        <div className="p-3 border-t border-sidebar-border bg-sidebar/50 text-[11px] font-mono space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>FastAPI Backend:</span>
            <span className="flex items-center gap-1.5 font-bold">
              <span
                className={`w-2 h-2 rounded-full ${
                  healthStatus === "online"
                    ? "bg-emerald-500 animate-pulse"
                    : healthStatus === "offline"
                      ? "bg-rose-500"
                      : "bg-amber-400"
                }`}
              />
              <span
                className={
                  healthStatus === "online"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground"
                }
              >
                {healthStatus === "online" ? "PORT :8000" : healthStatus.toUpperCase()}
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/80">
            <span>Isolation Mode:</span>
            <span>4-Zone Bridge</span>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Control Bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Mobile brand & hamburger */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/overview">
              <BayoraLogo variant="compact" size="sm" />
            </Link>
          </div>

          {/* Breadcrumb or title indication */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Control Room</span>
            <span>/</span>
            <span className="capitalize font-mono">
              {currentPath.replace("/", "").replace(/-/g, " ") || "overview"}
            </span>
          </div>

          {/* Right Controls: Role Selector + Action */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Perspective / Role Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs font-semibold cursor-pointer transition-all ${currentBadge.bg}`}
                >
                  <span className={`w-2 h-2 rounded-full ${currentBadge.dot}`} />
                  <span>{info.label}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  Security Perspective / Role
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ROLE_INFO.map((r) => (
                  <DropdownMenuItem
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`flex flex-col items-start gap-1 p-2.5 cursor-pointer text-xs ${
                      role === r.id ? "bg-accent font-medium" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold">{r.label}</span>
                      {role === r.id && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-normal leading-tight">
                      {r.plain}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick Action: New Evaluation */}
            <Link to="/runs/new">
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs h-8 px-3 shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                <span>New Evaluation</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-border bg-card px-4 py-3 space-y-4 text-xs">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md ${
                        item.match(currentPath)
                          ? "bg-accent text-accent-foreground font-semibold"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

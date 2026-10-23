import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield,
  Activity,
  Network,
  Database,
  GitCompare,
  FileCode2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Server,
  Terminal,
  Cpu,
  Layers,
  Fingerprint,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { useEntranceAnimation } from "../lib/motion";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const heroRef = useEntranceAnimation<HTMLDivElement>(50);
  const [selectedZone, setSelectedZone] = useState<string>("gateway");

  const zones = {
    red: {
      id: "red-net",
      name: "Untrusted Adversarial Runner",
      port: "8004",
      isolation: "Egress restricted; direct model/blue access blocked by iptables bridge.",
      probes: "T1 (Deny to Blue), T3 (Deny direct Model bypass)",
      color: "border-rose-500/40 bg-rose-500/5 text-rose-700 dark:text-rose-400",
    },
    blue: {
      id: "blue-net",
      name: "Defensive Policy Engine",
      port: "8001",
      isolation: "Confidential rule definitions, regex patterns, and canary injection secrets.",
      probes: "T2 (Deny reverse traversal to Red runner)",
      color: "border-blue-500/40 bg-blue-500/5 text-blue-700 dark:text-blue-400",
    },
    gateway: {
      id: "gateway:8002",
      name: "Policy Inspection Gateway",
      port: "8002",
      isolation:
        "The sole authorized routing conduit. Analyzes prompts and responses against policies.",
      probes: "T4 (Permitted mediation route with budget and regex enforcement)",
      color: "border-indigo-500/40 bg-indigo-500/5 text-indigo-700 dark:text-indigo-400",
    },
    model: {
      id: "model-net",
      name: "Isolated Model Runtime",
      port: "8003",
      isolation:
        "Completely unmapped to Red namespace. Clean session contexts guaranteed per evaluation.",
      probes: "T5 (Clean context verification, zero canary carry-over)",
      color: "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
    },
  };

  const capabilities = [
    {
      title: "Network Boundary Isolation",
      tag: "INVARIANTS T1–T5",
      icon: Network,
      desc: "Untrusted red-team test runners execute in isolated network namespaces. Docker bridge routing strictly denies direct traversal to model inference or blue-team policy secrets.",
      badge: "Real Socket Probes",
    },
    {
      title: "Adversarial Safety Benchmarks",
      tag: "OWASP LLM TOP 10",
      icon: Activity,
      desc: "Automated test suites evaluate jailbreaks, prompt injections, system prompt extraction, and canary exfiltration with latency percentile tracking (p50/p95).",
      badge: "Automated Lifecycles",
    },
    {
      title: "Immutable Policy Versioning",
      tag: "DEFENSE ENGINE",
      icon: FileCode2,
      desc: "Blue teams publish defensive guardrails with SHA-256 fingerprints. Role-based cryptographic tokens ensure red teams cannot inspect internal regex filters in advance.",
      badge: "Role-Redacted Logic",
    },
    {
      title: "Fresh Context Sessions",
      tag: "MEMORY LEAK DEFENSE",
      icon: ShieldCheck,
      desc: "Every evaluation run spawns an ephemeral execution state. Zero chat history, canary secrets, or cross-run memory can persist between evaluation cycles.",
      badge: "Zero Context Drift",
    },
    {
      title: "Cryptographic Evidence Ledger",
      tag: "SHA-256 HASH CHAIN",
      icon: Database,
      desc: "Every audit event links sequentially to Genesis 0x00. Modifying even 1 byte in historical logs mathematically invalidates all downstream verification hashes.",
      badge: "Tamper Drill Verified",
    },
    {
      title: "Comparative Run Diff",
      tag: "REGRESSION ANALYSIS",
      icon: GitCompare,
      desc: "Direct side-by-side delta evaluator. Highlights verdict transitions (e.g., DAN jailbreaks switching from ALLOW to BLOCKED) across baseline and hardened policies.",
      badge: "Side-by-Side Deltas",
    },
  ];

  return (
    <div className="space-y-24 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section ref={heroRef} className="space-y-8 text-center pt-8 md:pt-16 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-semibold tracking-wide">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          AI SECURITY INFRASTRUCTURE
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.1]">
          Test the model. <br />
          <span className="text-indigo-600 dark:text-indigo-400">Trust the environment.</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Evaluate adversarial AI safety while keeping attack payloads, defensive policies, and
          model sessions mathematically isolated—with verifiable cryptographic evidence for every
          run.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/overview">
            <Button
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm h-11 px-6"
            >
              Open Control Room <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <a href="#architecture">
            <Button
              size="lg"
              variant="outline"
              className="border-slate-300 dark:border-slate-700 h-11 px-6"
            >
              Explore Architecture
            </Button>
          </a>
        </div>
      </section>

      {/* Visual Centerpiece: Original Architecture Diagram */}
      <section id="architecture" className="space-y-6 scroll-mt-24">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Trust Boundaries & Network Segmentation
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Four partitioned network zones guarantee zero unmediated communication between
            adversaries and private models.
          </p>
        </div>

        {/* Embedded SVG Architecture Blueprint */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 overflow-hidden shadow-md p-2 sm:p-4">
          <img
            src="/brand/architecture-hero.svg"
            alt="BAYORA 4-Zone Security Architecture Diagram"
            className="w-full h-auto rounded-xl"
            loading="lazy"
          />
        </div>

        {/* Interactive Zone Inspector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          {Object.entries(zones).map(([key, z]) => {
            const isSelected = selectedZone === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedZone(key)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-xs ring-1 ring-indigo-500"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase">
                    Port :{z.port}
                  </span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div className="font-bold text-xs text-foreground mt-1 truncate">{z.name}</div>
                <div className="font-mono text-[11px] text-muted-foreground mt-0.5">{z.id}</div>
              </button>
            );
          })}
        </div>

        {/* Zone Detail Box */}
        {selectedZone && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-1.5 ${zones[selectedZone as keyof typeof zones].color}`}
          >
            <div className="font-bold uppercase tracking-wider text-[11px]">
              Active Boundary Specification: {zones[selectedZone as keyof typeof zones].id}
            </div>
            <p className="opacity-90">{zones[selectedZone as keyof typeof zones].isolation}</p>
            <div className="font-mono text-[10.5px] opacity-75">
              Associated Probes: {zones[selectedZone as keyof typeof zones].probes}
            </div>
          </div>
        )}
      </section>

      {/* Capabilities Section */}
      <section id="capabilities" className="space-y-8 scroll-mt-24">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Security Guarantees & Features
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Engineered specifically to solve Problem Statement 04: Securing Adversarial AI Safety
            Testing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {capabilities.map((c) => {
            const Icon = c.icon;
            return (
              <Card
                key={c.title}
                className="border-border shadow-xs hover:border-indigo-400/50 transition-colors"
              >
                <CardHeader className="p-5 pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Icon className="w-4 h-4" />
                    </span>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] tracking-wider text-muted-foreground"
                    >
                      {c.tag}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground">{c.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-semibold text-indigo-600 dark:text-indigo-400">
                      ✓ {c.badge}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Evidence & Integrity Section */}
      <section
        id="evidence"
        className="rounded-2xl border border-border bg-card p-6 sm:p-10 space-y-8 scroll-mt-24"
      >
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            <Database className="w-3.5 h-3.5" /> Cryptographic Non-Repudiation
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Why Mathematical Proofs Matter for AI Safety
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            In compliance and regulatory audits, subjective screenshots are insufficient. BAYORA
            guarantees tamper-evidence by linking all evaluation outcomes into a verifiable SHA-256
            hash sequence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-border bg-background space-y-2">
            <span className="font-mono font-bold text-primary">01 / CANONICAL SERIALIZATION</span>
            <div className="font-semibold text-foreground text-sm">Deterministic Payload JSON</div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              All events strip non-deterministic keys and sort fields canonically before SHA-256
              ingestion.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-background space-y-2">
            <span className="font-mono font-bold text-primary">02 / GENESIS LINKING</span>
            <div className="font-semibold text-foreground text-sm">Continuous Hash Chain</div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Event n locks <code>prev_hash</code> equal to Event n-1. Modifying event #2 breaks
              verification at sequence #3.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-background space-y-2">
            <span className="font-mono font-bold text-primary">03 / TAMPER DEMO DRILL</span>
            <div className="font-semibold text-foreground text-sm">Zero-Risk Verification</div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Drills execute on disposable copies in memory. The PostgreSQL audit ledger remains
              100% untouched.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground font-mono">
            Genesis Hash:{" "}
            <code>0000000000000000000000000000000000000000000000000000000000000000</code>
          </div>
          <Link to="/audit">
            <Button size="sm" variant="outline" className="text-xs font-semibold">
              Inspect Audit Ledger <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Call to Action Bar */}
      <section className="rounded-2xl bg-indigo-950 text-white p-8 sm:p-12 text-center space-y-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Ready to inspect the live control plane?
        </h2>
        <p className="text-xs sm:text-sm text-indigo-200 max-w-xl mx-auto leading-relaxed">
          Switch to the operator workspace to launch benchmark evaluations, test live boundary
          socket assertions, and inspect cryptographic ledgers.
        </p>
        <div>
          <Link to="/overview">
            <Button
              size="lg"
              className="bg-white hover:bg-slate-100 text-indigo-950 font-bold px-8 shadow-md"
            >
              Launch Control Room Workspace <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

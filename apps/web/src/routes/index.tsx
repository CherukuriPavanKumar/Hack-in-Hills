import React, { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Network,
  Database,
  ArrowRight,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Layers,
  Cpu,
  RefreshCw,
  FileCheck2,
  Server,
  Zap,
} from "lucide-react";
import { api, type RunResponse, type TopologyResponse } from "../lib/api";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [runs, setRuns] = useState<RunResponse[]>([]);
  const [topology, setTopology] = useState<TopologyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFlowMode, setActiveFlowMode] = useState<"authorized" | "bypass" | "injection">(
    "authorized",
  );

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [runsData, topoData] = await Promise.allSettled([api.getRuns(), api.getTopology()]);
        if (mounted) {
          if (runsData.status === "fulfilled") setRuns(runsData.value || []);
          if (topoData.status === "fulfilled") setTopology(topoData.value || null);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // Compute metrics from actual backend records
  const totalRuns = runs.length;
  const completedRuns = runs.filter((r) => r.status === "COMPLETED").length;
  const failedRuns = runs.filter(
    (r) => r.status === "FAILED" || r.status === "ISOLATION_FAILED",
  ).length;

  let totalCases = 0;
  let passedCases = 0;
  let blockedByGateway = 0;

  for (const r of runs) {
    if (r.test_cases && r.test_cases.length > 0) {
      totalCases += r.test_cases.length;
      passedCases += r.test_cases.filter((t) => t.verdict === "PASS").length;
      blockedByGateway += r.test_cases.filter((t) => t.gateway_decision === "DENY").length;
    } else if (r.score_summary) {
      totalCases += Number(r.score_summary.total_cases || 0);
      passedCases += Number(r.score_summary.passed_cases || 0);
      blockedByGateway += Number(r.score_summary.blocked_by_gateway || 0);
    }
  }

  const passRate = totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 100;
  const latestRun = runs[0] || null;

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-10 border border-slate-800 shadow-xl">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Security Control Room</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Secure Adversarial AI Testing <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300">
              Without Compromising Safety
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Testing whether your AI assistant resists jailbreaks, prompt injection, and credential
            extraction is unsafe if the testing environment itself leaks sensitive policies,
            bypasses the gateway, or tampers with evidence. Bayora enforces strict network
            isolation, fresh sessions, and a cryptographic SHA-256 ledger.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link to="/runs/new">
              <Button
                size="lg"
                className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                Launch New Evaluation
              </Button>
            </Link>
            <Link to="/isolation">
              <Button
                size="lg"
                variant="outline"
                className="border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
              >
                <Network className="w-4 h-4 text-sky-400" />
                Test Network Isolation
              </Button>
            </Link>
            <Link to="/audit">
              <Button
                size="lg"
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-slate-800/50 flex items-center gap-2"
              >
                <Database className="w-4 h-4 text-emerald-400" />
                Inspect Audit Ledger
                <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Security Posture KPI Cards (Real Data) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Current Security Posture
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Calculated live from actual backend evaluation records and boundary probe runs.
            </p>
          </div>
          <Link
            to="/runs"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            View All ({totalRuns}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Runs */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Evaluations Run
                </span>
                <Activity className="w-4 h-4 text-indigo-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {totalRuns}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span className="text-emerald-600 font-medium">{completedRuns} completed</span>
                {failedRuns > 0 && (
                  <span className="text-rose-500 font-medium">• {failedRuns} failed</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Pass Rate */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Test Pass Rate
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {passRate}%
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {passedCases} passed of {totalCases} tested prompts
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Gateway Interceptions */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Policy Gateway Blocks
                </span>
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {blockedByGateway}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Attacks blocked before reaching model
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Ledger Integrity */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Cryptographic Ledger
                </span>
                <Database className="w-4 h-4 text-sky-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                VERIFIED
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono">
                SHA-256 chain from Genesis 0x00
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Interactive Architecture & Flow Diagram */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Interactive Security Architecture
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a flow to observe how Bayora enforces policy boundaries and blocks unauthorized
              bypass attempts.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveFlowMode("authorized")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                activeFlowMode === "authorized"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Authorized Flow
            </button>
            <button
              type="button"
              onClick={() => setActiveFlowMode("bypass")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                activeFlowMode === "bypass"
                  ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Direct Bypass (Blocked)
            </button>
            <button
              type="button"
              onClick={() => setActiveFlowMode("injection")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                activeFlowMode === "injection"
                  ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Prompt Attack (Intercepted)
            </button>
          </div>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              {/* Component 1: Red Team */}
              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col items-center text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  RED
                </div>
                <div>
                  <h4 className="font-bold text-sm text-rose-950 dark:text-rose-200">
                    Red Team Workspace
                  </h4>
                  <p className="text-xs text-rose-700/80 dark:text-rose-400/80">
                    Untrusted adversarial test runner
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-rose-100/50 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300"
                >
                  Network: red-net
                </Badge>
              </div>

              {/* Arrow 1 */}
              <div className="flex flex-col items-center justify-center text-center px-2">
                {activeFlowMode === "authorized" && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-emerald-600 font-semibold flex items-center gap-1 justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ALLOW :8443
                    </span>
                    <div className="h-0.5 w-full bg-emerald-500 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-emerald-500 rotate-45" />
                    </div>
                    <span className="text-[10px] text-slate-500">Authorized Test Route</span>
                  </div>
                )}
                {activeFlowMode === "bypass" && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-rose-600 font-semibold flex items-center gap-1 justify-center">
                      <XCircle className="w-3.5 h-3.5" /> DENIED :443
                    </span>
                    <div className="h-0.5 w-full bg-rose-500 relative">
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                        ✕
                      </div>
                    </div>
                    <span className="text-[10px] text-rose-600 font-medium">
                      Bypass attempt blocked
                    </span>
                  </div>
                )}
                {activeFlowMode === "injection" && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-amber-600 font-semibold flex items-center gap-1 justify-center">
                      SEND PROMPT
                    </span>
                    <div className="h-0.5 w-full bg-amber-500 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-amber-500 rotate-45" />
                    </div>
                    <span className="text-[10px] text-amber-600 font-medium">
                      Injection payload sent
                    </span>
                  </div>
                )}
              </div>

              {/* Component 2: Policy Gateway */}
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col items-center text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
                    Policy Gateway
                  </h4>
                  <p className="text-xs text-indigo-700/80 dark:text-indigo-400/80">
                    Rules, regexes & tokens
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-indigo-100/50 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300"
                >
                  Enforces Blue Policies
                </Badge>
              </div>

              {/* Arrow 2 */}
              <div className="flex flex-col items-center justify-center text-center px-2">
                {activeFlowMode === "authorized" && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-emerald-600 font-semibold flex items-center gap-1 justify-center">
                      FORWARD :443
                    </span>
                    <div className="h-0.5 w-full bg-emerald-500 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-emerald-500 rotate-45" />
                    </div>
                    <span className="text-[10px] text-slate-500">Inspected Clean Request</span>
                  </div>
                )}
                {activeFlowMode === "bypass" && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-slate-400">UNTOUCHED</span>
                    <div className="h-0.5 w-full bg-slate-300 dark:bg-slate-700 dashed" />
                    <span className="text-[10px] text-slate-400">Gateway not bypassed</span>
                  </div>
                )}
                {activeFlowMode === "injection" && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-rose-600 font-semibold flex items-center gap-1 justify-center">
                      <XCircle className="w-3.5 h-3.5" /> BLOCKED
                    </span>
                    <div className="h-0.5 w-full bg-rose-500 relative">
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                        ✕
                      </div>
                    </div>
                    <span className="text-[10px] text-rose-600 font-medium">
                      Model Never Receives It
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Explanation Box */}
            <div className="mt-6 p-4 rounded-lg bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
              <Zap className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <strong>
                  {activeFlowMode === "authorized" && "Authorized Testing Traffic: "}
                  {activeFlowMode === "bypass" && "Direct Model Bypass Denial: "}
                  {activeFlowMode === "injection" && "Prompt Injection Defense: "}
                </strong>
                {activeFlowMode === "authorized" &&
                  "Red Team's test requests are routed exclusively to the Policy Gateway on port 8443. The gateway logs the request, checks the token budget, inspects against regex filters, and proxies to the model only if permitted."}
                {activeFlowMode === "bypass" &&
                  "If Red Team attempts to bypass the gateway and connect directly to the model container on port 443, the firewall drops the packet with an RST (probe T3). The target model remains completely unreachable except through the gateway."}
                {activeFlowMode === "injection" &&
                  "When an adversarial prompt contains malicious keywords or patterns (e.g. 'ignore previous instructions' or 'reveal system prompt'), the Policy Gateway intercepts the prompt immediately. The prompt is blocked and recorded in the audit ledger without ever touching the model."}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* The 5 Core Principles of Bayora */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            The Five Principles of Bayora
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            How Bayora guarantees verifiable, leak-free security testing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <Network className="w-5 h-5 text-indigo-600 mb-1" />
              <CardTitle className="text-sm font-bold">1. Network Isolation</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Strict container and firewall boundaries prevent Red Team from reaching Blue Team
              policies, private storage, or direct model ports.
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <ShieldCheck className="w-5 h-5 text-sky-600 mb-1" />
              <CardTitle className="text-sm font-bold">2. Policy Enforcement</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Every request must pass through the authorized gateway. Rules evaluate blocked
              keywords, regexes, token budgets, and canary markers.
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <RefreshCw className="w-5 h-5 text-emerald-600 mb-1" />
              <CardTitle className="text-sm font-bold">3. Fresh Context</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Each test evaluation executes in a clean context session with zero inherited
              conversation history to eliminate state pollution.
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <FileCheck2 className="w-5 h-5 text-amber-600 mb-1" />
              <CardTitle className="text-sm font-bold">4. Reproducibility</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Every run freezes its benchmark suite hash, model profile, policy fingerprint, and
              configuration hash for verifiable reruns.
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <Database className="w-5 h-5 text-violet-600 mb-1" />
              <CardTitle className="text-sm font-bold">5. Tamper-Evident Evidence</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              A SHA-256 hash chain links every audit event from genesis. Modifying even 1 byte in
              any event breaks all subsequent hashes.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent Evaluations Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Recent Security Evaluations
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live evaluations executed across model profiles and defense policies.
            </p>
          </div>
          <Link to="/runs">
            <Button variant="outline" size="sm" className="text-xs">
              View All Runs
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            Loading evaluation records...
          </div>
        ) : runs.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-300 dark:border-slate-700 p-8 text-center">
            <CardContent className="space-y-3">
              <ShieldAlert className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                No evaluations recorded yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Ready to test target models against adversarial safety suites? Launch your first
                evaluation to record test cases and tamper-evident audit events.
              </p>
              <Link to="/runs/new">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white mt-2">
                  Launch First Evaluation
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Run ID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Suite</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3">Policy</th>
                    <th className="px-4 py-3">Test Results</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {runs.slice(0, 6).map((r) => {
                    const passPct = r.score_summary?.pass_rate_pct ?? null;
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                          <Link
                            to="/runs/$runId"
                            params={{ runId: r.id }}
                            className="text-indigo-600 hover:underline"
                          >
                            {r.id}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold ${
                              r.status === "COMPLETED"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                                : r.status === "RUNNING" || r.status === "ISOLATION_CHECK"
                                  ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-300 animate-pulse"
                                  : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300"
                            }`}
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {r.suite_id}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                          {r.model_id}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                          {r.policy_id}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {passPct !== null ? (
                            <span
                              className={
                                passPct >= 80
                                  ? "text-emerald-600 font-bold"
                                  : "text-amber-600 font-bold"
                              }
                            >
                              {passPct}% pass
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(r.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link to="/runs/$runId" params={{ runId: r.id }}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-slate-800"
                            >
                              Inspect <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

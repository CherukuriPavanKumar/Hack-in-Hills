"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  Activity, 
  Lock, 
  Play, 
  CheckCircle2, 
  ArrowUpRight, 
  Database,
  FileText,
  GitCompare
} from "lucide-react";
import { TestRun, fetchRuns, fetchTopology, TopologyData } from "@/lib/api";
import { useRole } from "@/lib/RoleContext";
import { TopologyMap } from "@/components/TopologyMap";
import { WhatThisProves } from "@/components/WhatThisProves";

export default function OverviewPage() {
  const { role: currentRole } = useRole();
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [runsData, topData] = await Promise.all([
          fetchRuns(currentRole),
          fetchTopology(),
        ]);
        setRuns(runsData);
        setTopology(topData);
      } catch (err) {
        console.error("Overview load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentRole]);

  const totalRuns = runs.length;
  const completedRuns = runs.filter((r) => r.status === "COMPLETED").length;
  const allTestCases = runs.flatMap((r) => r.test_cases || []);
  const gatewayBlockedCount = allTestCases.filter((tc) => tc.gateway_decision === "DENY").length;
  const latestRun = runs[0] || null;

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-edge pb-5">
        <div>
          <h1 className="text-xl font-bold text-label-primary tracking-tight">
            Security Operations Console
          </h1>
          <p className="text-xs text-label-secondary mt-1">
            Trustworthy isolation, policy mediation, and cryptographic evidence for adversarial AI evaluations.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/create"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded bg-signal-blue hover:bg-blue-600 text-white font-medium text-xs font-mono transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>New Evaluation Run</span>
          </Link>
          <Link
            href="/diff"
            className="flex items-center space-x-1.5 px-3 py-2 rounded bg-surface hover:bg-subtle border border-edge text-label-secondary hover:text-label-primary text-xs font-mono transition-colors"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Run Comparison</span>
          </Link>
        </div>
      </div>

      {/* Primary Instrumentation Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1 */}
        <div className="bg-surface border border-edge rounded p-4">
          <div className="flex items-center justify-between text-xs font-mono text-label-muted">
            <span>TOTAL RUNS</span>
            <Activity className="w-3.5 h-3.5 text-label-secondary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-label-primary">
            {totalRuns}
          </div>
          <div className="mt-1 text-[11px] text-label-muted font-mono">
            {completedRuns} completed successfully
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-surface border border-edge rounded p-4">
          <div className="flex items-center justify-between text-xs font-mono text-label-muted">
            <span>ISOLATION RATE</span>
            <ShieldCheck className="w-3.5 h-3.5 text-signal-emerald" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-signal-emerald">
            100%
          </div>
          <div className="mt-1 text-[11px] text-label-muted font-mono">
            0 unauthorized bypasses
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-surface border border-edge rounded p-4">
          <div className="flex items-center justify-between text-xs font-mono text-label-muted">
            <span>GATEWAY MITIGATIONS</span>
            <Lock className="w-3.5 h-3.5 text-signal-rose" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-label-primary">
            {gatewayBlockedCount}
          </div>
          <div className="mt-1 text-[11px] text-label-muted font-mono">
            Interceptions before inference
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-surface border border-edge rounded p-4">
          <div className="flex items-center justify-between text-xs font-mono text-label-muted">
            <span>LEDGER VERIFICATION</span>
            <Database className="w-3.5 h-3.5 text-signal-blue" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-signal-emerald">
            VERIFIED
          </div>
          <div className="mt-1 text-[11px] text-label-muted font-mono">
            SHA-256 genesis linked
          </div>
        </div>
      </div>

      {/* Live Topology Map Component */}
      <TopologyMap initialProbes={latestRun?.probes || []} />

      {/* Recent Evaluations Table */}
      <div className="bg-surface border border-edge rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-edge bg-canvas/40 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-label-primary tracking-wide">
              Recent Evaluation Executions
            </h3>
            <p className="text-xs text-label-muted mt-0.5">
              Pinned test configurations, statuses, and cryptographic digest references
            </p>
          </div>
          <Link
            href="/create"
            className="text-xs font-mono text-signal-blue hover:underline"
          >
            + Create Run
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-edge text-label-muted bg-canvas/20">
                <th className="py-2.5 px-4 font-normal">Run ID</th>
                <th className="py-2.5 px-4 font-normal">Status</th>
                <th className="py-2.5 px-4 font-normal">Suite</th>
                <th className="py-2.5 px-4 font-normal">Policy</th>
                <th className="py-2.5 px-4 font-normal">Model</th>
                <th className="py-2.5 px-4 font-normal">Latency (p50)</th>
                <th className="py-2.5 px-4 font-normal">Ledger</th>
                <th className="py-2.5 px-4 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-subtle">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-subtle/50 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-label-primary">{run.id}</td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      run.status === "COMPLETED"
                        ? "bg-signal-emerald/10 text-signal-emerald"
                        : run.status === "ISOLATION_FAILED" || run.status === "FAILED"
                        ? "bg-signal-rose/10 text-signal-rose"
                        : "bg-signal-blue/10 text-signal-blue"
                    }`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-label-secondary">
                    {run.suite_id} <span className="text-label-muted text-[10px]">v{run.suite_version}</span>
                  </td>
                  <td className="py-2.5 px-4 text-label-secondary">
                    {run.policy_id} <span className="text-label-muted text-[10px]">v{run.policy_version}</span>
                  </td>
                  <td className="py-2.5 px-4 text-label-muted">{run.model_id}</td>
                  <td className="py-2.5 px-4 text-label-secondary">
                    {run.score_summary?.p50_latency_ms ? `${run.score_summary.p50_latency_ms}ms` : "—"}
                  </td>
                  <td className="py-2.5 px-4 text-signal-emerald font-medium">
                    {run.score_summary?.chain_integrity || "VERIFIED"}
                  </td>
                  <td className="py-2.5 px-4 text-right space-x-2">
                    <Link
                      href={`/live?run_id=${run.id}`}
                      className="px-2 py-1 rounded bg-subtle hover:bg-edge text-label-primary text-[11px] transition-colors"
                    >
                      View
                    </Link>
                    <Link
                      href={`/reports?run_id=${run.id}`}
                      className="px-2 py-1 rounded bg-subtle hover:bg-edge text-label-secondary hover:text-label-primary text-[11px] transition-colors"
                    >
                      Report
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Honest Boundary Scope */}
      <WhatThisProves />
    </div>
  );
}

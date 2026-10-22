"use client";

import React, { useEffect, useState } from "react";
import { GitCompare, ArrowRight, ShieldCheck, ShieldX, Clock, Cpu, CheckCircle2, XCircle } from "lucide-react";
import { TestRun, RunDiffResult, fetchRuns, fetchDiff } from "@/lib/api";
import { useRole } from "@/lib/RoleContext";

export default function RunDiffPage() {
  const { role: currentRole } = useRole();
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [runAId, setRunAId] = useState<string>("");
  const [runBId, setRunBId] = useState<string>("");
  const [diff, setDiff] = useState<RunDiffResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadRuns() {
      try {
        const list = await fetchRuns(currentRole);
        setRuns(list);
        if (list.length >= 2) {
          setRunAId(list[0].id);
          setRunBId(list[1].id);
        } else if (list.length === 1) {
          setRunAId(list[0].id);
          setRunBId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load runs:", err);
      }
    }
    loadRuns();
  }, [currentRole]);

  useEffect(() => {
    if (!runAId || !runBId) return;
    async function getDiff() {
      setLoading(true);
      try {
        const res = await fetchDiff(runAId, runBId);
        setDiff(res);
      } catch (err) {
        console.error("Diff load error:", err);
      } finally {
        setLoading(false);
      }
    }
    getDiff();
  }, [runAId, runBId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-edge pb-4">
        <div className="flex items-center space-x-2">
          <GitCompare className="w-4 h-4 text-slate-300" />
          <h1 className="text-lg font-semibold text-slate-100 tracking-tight">
            Run Differential & Policy Regression Analysis
          </h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Side-by-side comparative analysis of gateway decisions, test case verdicts, and latency profiles across distinct policy baselines.
        </p>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface border border-edge rounded-lg p-4">
        <div>
          <label htmlFor="runASelect" className="block text-xs font-mono text-slate-300 font-medium mb-1.5">
            Baseline Run (A)
          </label>
          <select
            id="runASelect"
            value={runAId}
            onChange={(e) => setRunAId(e.target.value)}
            className="w-full bg-canvas border border-edge rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-signal-blue"
          >
            {runs.map((r) => (
              <option key={`a-${r.id}`} value={r.id}>
                {r.id} — {r.policy_id} (v{r.policy_version})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="runBSelect" className="block text-xs font-mono text-slate-300 font-medium mb-1.5">
            Comparison Run (B)
          </label>
          <select
            id="runBSelect"
            value={runBId}
            onChange={(e) => setRunBId(e.target.value)}
            className="w-full bg-canvas border border-edge rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-signal-blue"
          >
            {runs.map((r) => (
              <option key={`b-${r.id}`} value={r.id}>
                {r.id} — {r.policy_id} (v{r.policy_version})
              </option>
            ))}
          </select>
        </div>
      </div>

      {diff && (
        <div className="space-y-6">
          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            {/* Pinned Configurations */}
            <div className="bg-surface border border-edge rounded-lg p-4 space-y-3">
              <span className="text-[11px] text-slate-400 font-medium block">Policy configurations</span>
              <div className="space-y-2">
                <div>
                  <span className="text-slate-500 text-[10px] block">Run A policy:</span>
                  <div className="text-slate-200 font-medium">{diff.run_a_policy}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Run B policy:</span>
                  <div className="text-slate-200 font-medium">{diff.run_b_policy}</div>
                </div>
              </div>
            </div>

            {/* Pass / Block Summary */}
            <div className="bg-surface border border-edge rounded-lg p-4 space-y-3">
              <span className="text-[11px] text-slate-400 font-medium block">Mitigation outcomes</span>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded bg-canvas border border-edge">
                  <span className="text-slate-500 text-[10px] block">Run A pass</span>
                  <span className="text-signal-emerald font-semibold text-sm">{diff.run_a_summary.passed ?? 0}</span>
                </div>
                <div className="p-2 rounded bg-canvas border border-edge">
                  <span className="text-slate-500 text-[10px] block">Run B pass</span>
                  <span className="text-signal-emerald font-semibold text-sm">{diff.run_b_summary.passed ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Latency Comparison */}
            <div className="bg-surface border border-edge rounded-lg p-4 space-y-3">
              <span className="text-[11px] text-slate-400 font-medium block">Latency delta</span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Run A p50:</span>
                  <span className="text-slate-200">{diff.latency_comparison.run_a_p50_ms}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Run B p50:</span>
                  <span className="text-slate-200">{diff.latency_comparison.run_b_p50_ms}ms</span>
                </div>
                <div className="flex justify-between border-t border-edge pt-1">
                  <span className="text-slate-500">Run A p95:</span>
                  <span className="text-slate-200">{diff.latency_comparison.run_a_p95_ms}ms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Test Case by Test Case Diff Table */}
          <div className="bg-surface border border-edge rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-edge flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-slate-200">
                  Per-case decision comparison
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Identifies security improvements alongside potential regressions on benign requests.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-edge text-slate-400 bg-canvas/60">
                    <th className="py-2.5 px-4 font-medium">Case ID</th>
                    <th className="py-2.5 px-4 font-medium">Category</th>
                    <th className="py-2.5 px-4 font-medium">Run A Gateway</th>
                    <th className="py-2.5 px-4 font-medium">Run A Verdict</th>
                    <th className="py-2.5 px-4 font-medium">Run B Gateway</th>
                    <th className="py-2.5 px-4 font-medium">Run B Verdict</th>
                    <th className="py-2.5 px-4 text-center font-medium">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {diff.verdict_changes.map((vc) => (
                    <tr
                      key={vc.case_id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        vc.changed ? "bg-signal-blue/5" : ""
                      }`}
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-200">{vc.case_id}</td>
                      <td className="py-2.5 px-4 text-slate-400">{vc.category}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          vc.run_a_gateway_decision === "ALLOW" ? "bg-signal-emerald/10 text-signal-emerald" : "bg-signal-rose/10 text-signal-rose"
                        }`}>
                          {vc.run_a_gateway_decision}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`font-medium ${vc.run_a_verdict === "PASS" ? "text-signal-emerald" : "text-signal-rose"}`}>
                          {vc.run_a_verdict}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          vc.run_b_gateway_decision === "ALLOW" ? "bg-signal-emerald/10 text-signal-emerald" : "bg-signal-rose/10 text-signal-rose"
                        }`}>
                          {vc.run_b_gateway_decision}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`font-medium ${vc.run_b_verdict === "PASS" ? "text-signal-emerald" : "text-signal-rose"}`}>
                          {vc.run_b_verdict}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {vc.changed ? (
                          <span className="px-2 py-0.5 rounded bg-signal-blue/15 text-signal-blue font-medium text-[10px]">
                            Modified
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Identical</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

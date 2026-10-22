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
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
          <h1 className="text-2xl font-extrabold text-white tracking-wide">
            Run Diff & Reproducibility Analysis
          </h1>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 ml-2">
            WOW MOMENT 3
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Compare two evaluation runs side-by-side to verify deterministic reproducibility or measure the empirical impact of updated Blue defense policies.
        </p>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
        <div>
          <label className="block text-xs font-mono text-cyan-400 font-bold mb-2">
            RUN A (Baseline)
          </label>
          <select
            value={runAId}
            onChange={(e) => setRunAId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {runs.map((r) => (
              <option key={`a-${r.id}`} value={r.id}>
                {r.id} — {r.policy_id} (v{r.policy_version})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono text-indigo-400 font-bold mb-2">
            RUN B (Comparison / Updated Policy)
          </label>
          <select
            value={runBId}
            onChange={(e) => setRunBId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
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
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-[11px] text-slate-400 uppercase font-bold block">Configurations</span>
              <div className="space-y-2">
                <div>
                  <span className="text-slate-500 text-[10px]">RUN A POLICY:</span>
                  <div className="text-cyan-300 font-semibold">{diff.run_a_policy}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">RUN B POLICY:</span>
                  <div className="text-indigo-300 font-semibold">{diff.run_b_policy}</div>
                </div>
              </div>
            </div>

            {/* Pass / Block Summary */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-[11px] text-slate-400 uppercase font-bold block">Verdict Distribution</span>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">RUN A PASS</span>
                  <span className="text-emerald-400 font-bold text-base">{diff.run_a_summary.passed ?? 0}</span>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">RUN B PASS</span>
                  <span className="text-emerald-400 font-bold text-base">{diff.run_b_summary.passed ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Latency Comparison */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-[11px] text-slate-400 uppercase font-bold block">Latency Overhead</span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Run A p50:</span>
                  <span className="text-slate-200">{diff.latency_comparison.run_a_p50_ms}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Run B p50:</span>
                  <span className="text-slate-200">{diff.latency_comparison.run_b_p50_ms}ms</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1">
                  <span className="text-slate-500">Run A p95:</span>
                  <span className="text-slate-200">{diff.latency_comparison.run_a_p95_ms}ms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Test Case by Test Case Diff Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white tracking-wide">
                  Per-Test Case Comparison & Decision Deltas
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verifies that updated policies block attacks without causing false positive blocks on benign requests
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                    <th className="py-3 px-4">Case ID</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Run A Gateway</th>
                    <th className="py-3 px-4">Run A Verdict</th>
                    <th className="py-3 px-4">Run B Gateway</th>
                    <th className="py-3 px-4">Run B Verdict</th>
                    <th className="py-3 px-4 text-center">Status Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {diff.verdict_changes.map((vc) => (
                    <tr
                      key={vc.case_id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        vc.changed ? "bg-indigo-950/20" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-200">{vc.case_id}</td>
                      <td className="py-3 px-4 text-slate-400">{vc.category}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          vc.run_a_gateway_decision === "ALLOW" ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"
                        }`}>
                          {vc.run_a_gateway_decision}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${vc.run_a_verdict === "PASS" ? "text-emerald-400" : "text-rose-400"}`}>
                          {vc.run_a_verdict}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          vc.run_b_gateway_decision === "ALLOW" ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"
                        }`}>
                          {vc.run_b_gateway_decision}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${vc.run_b_verdict === "PASS" ? "text-emerald-400" : "text-rose-400"}`}>
                          {vc.run_b_verdict}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {vc.changed ? (
                          <span className="px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 font-bold text-[10px]">
                            VERDICT CHANGED
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">IDENTICAL</span>
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

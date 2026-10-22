"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Activity, 
  ShieldCheck, 
  ShieldX, 
  Play, 
  Lock, 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Hash, 
  Eye, 
  RefreshCw,
  Cpu,
  Layers,
  Info
} from "lucide-react";
import { 
  TestRun, 
  TestCaseResult, 
  AuditEvent, 
  fetchRuns, 
  fetchRun, 
  fetchRunEvents 
} from "@/lib/api";
import { useRole } from "@/lib/RoleContext";
import { LifecycleProgress } from "@/components/LifecycleProgress";
import { TopologyMap } from "@/components/TopologyMap";

function LiveViewContent() {
  const { role: currentRole } = useRole();
  const searchParams = useSearchParams();
  const requestedRunId = searchParams?.get("run_id") || null;

  const [runs, setRuns] = useState<TestRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(requestedRunId);
  const [run, setRun] = useState<TestRun | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<TestCaseResult | null>(null);

  // Poll for live run updates if running
  useEffect(() => {
    async function init() {
      try {
        const allRuns = await fetchRuns(currentRole);
        setRuns(allRuns);

        const targetId = activeRunId || (allRuns.length > 0 ? allRuns[0].id : null);
        if (targetId) {
          setActiveRunId(targetId);
          const [runDetail, evList] = await Promise.all([
            fetchRun(targetId, currentRole),
            fetchRunEvents(targetId),
          ]);
          setRun(runDetail);
          setEvents(evList);
        }
      } catch (err) {
        console.error("Live view load error:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [activeRunId, currentRole]);

  // Periodic refresh if run is active
  useEffect(() => {
    if (!run || run.status === "COMPLETED" || run.status === "FAILED") return;
    const interval = setInterval(async () => {
      try {
        const [updatedRun, updatedEvents] = await Promise.all([
          fetchRun(run.id, currentRole),
          fetchRunEvents(run.id),
        ]);
        setRun(updatedRun);
        setEvents(updatedEvents);
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [run, currentRole]);

  const handleSelectRun = async (id: string) => {
    setActiveRunId(id);
    try {
      const [r, ev] = await Promise.all([fetchRun(id, currentRole), fetchRunEvents(id)]);
      setRun(r);
      setEvents(ev);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header & Run Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
            <h1 className="text-2xl font-extrabold text-white tracking-wide">
              Run Live View & Execution Timeline
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time orchestrator state transitions, network boundary probes, gateway decisions, and deterministic verdicts.
          </p>
        </div>

        {/* Run Selector Dropdown */}
        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono text-slate-400">SELECT RUN:</span>
          <select
            value={activeRunId || ""}
            onChange={(e) => handleSelectRun(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} ({r.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {run && (
        <>
          {/* Metadata Bar */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-6 gap-4 text-xs font-mono backdrop-blur-sm">
            <div>
              <span className="text-slate-500 block text-[10px]">RUN ID</span>
              <span className="text-cyan-300 font-bold truncate block">{run.id}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">BENCHMARK SUITE</span>
              <span className="text-slate-200 block truncate">{run.suite_id} (v{run.suite_version})</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">DEFENSE POLICY</span>
              <span className="text-indigo-400 block truncate">{run.policy_id} (v{run.policy_version})</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">MODEL PROFILE</span>
              <span className="text-emerald-400 block truncate">{run.model_id}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">CLEAN CONTEXT</span>
              <span className="text-emerald-400 font-bold block">ENFORCED (sess_{run.id.slice(0, 8)})</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">CONFIG SHA-256</span>
              <span className="text-slate-400 block truncate" title={run.config_hash}>
                {run.config_hash.slice(0, 12)}...
              </span>
            </div>
          </div>

          {/* Lifecycle Stepper */}
          <LifecycleProgress currentStatus={run.status} />

          {/* Live Topology Map */}
          <TopologyMap initialProbes={run.probes || []} />

          {/* Test Case Execution Grid */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white tracking-wide">
                  Adversarial Test Case Results & Gateway Interceptions
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Deterministic evaluation verdicts based on gateway policy enforcement and model responses
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Passed: {run.score_summary?.passed ?? 0}
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                  Failed: {run.score_summary?.failed ?? 0}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                    <th className="py-3 px-4">Case ID</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Gateway Decision</th>
                    <th className="py-3 px-4">Rationale Code</th>
                    <th className="py-3 px-4">Evaluator Verdict</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {run.test_cases?.map((tc) => (
                    <tr key={tc.case_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-200">{tc.case_id}</td>
                      <td className="py-3 px-4 text-slate-400">{tc.category}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          tc.gateway_decision === "ALLOW"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-rose-950 text-rose-400 border border-rose-800"
                        }`}>
                          {tc.gateway_decision}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={tc.gateway_reason || tc.rationale_code}>
                        {tc.gateway_reason || tc.rationale_code}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-bold flex items-center space-x-1 ${
                          tc.verdict === "PASS"
                            ? "text-emerald-400"
                            : tc.verdict === "FAIL"
                            ? "text-rose-400"
                            : "text-amber-400"
                        }`}>
                          {tc.verdict === "PASS" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          <span>{tc.verdict}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{tc.latency_ms}ms</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedCase(tc)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors text-[11px]"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Event Stream Timeline */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-base font-semibold text-white tracking-wide">
                  Audit Event Sequence ({events.length} Events)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chronological hash-linked ledger entries recorded for this evaluation run
                </p>
              </div>
              <Link
                href="/integrity"
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
              >
                <span>Integrity Center & Tamper Drill →</span>
              </Link>
            </div>

            <div className="space-y-3 font-mono text-xs max-h-96 overflow-y-auto pr-2">
              {events.map((evt) => (
                <div
                  key={evt.seq}
                  className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded bg-slate-800 text-cyan-400 flex items-center justify-center font-bold text-[10px]">
                      #{evt.seq}
                    </span>
                    <span className="font-semibold text-slate-200">{evt.event_type}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      actor: {evt.actor}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-[11px] text-slate-500">
                    <span title={evt.event_hash}>SHA256: {evt.event_hash.slice(0, 14)}...</span>
                    <span>{evt.timestamp.slice(11, 19)} UTC</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Inspect Test Case Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm font-bold text-cyan-400">{selectedCase.case_id}</span>
                <span className="text-xs text-slate-400 font-mono">({selectedCase.category})</span>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-slate-400 hover:text-slate-200 font-mono text-xs px-2 py-1 rounded bg-slate-800"
              >
                CLOSE
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-mono text-slate-400 uppercase font-bold block mb-1">
                  Prompt Payload (Role-Aware Masking)
                </label>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-200 font-mono whitespace-pre-wrap">
                  {selectedCase.prompt}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">GATEWAY DECISION</span>
                  <span className={`font-bold ${selectedCase.gateway_decision === "ALLOW" ? "text-emerald-400" : "text-rose-400"}`}>
                    {selectedCase.gateway_decision}
                  </span>
                  <p className="text-slate-400 mt-1 text-[11px]">{selectedCase.gateway_reason}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">EVALUATOR VERDICT</span>
                  <span className={`font-bold ${selectedCase.verdict === "PASS" ? "text-emerald-400" : "text-rose-400"}`}>
                    {selectedCase.verdict}
                  </span>
                  <p className="text-slate-400 mt-1 text-[11px]">{selectedCase.rationale_code}</p>
                </div>
              </div>

              {selectedCase.model_response && (
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase font-bold block mb-1">
                    Target Model Response
                  </label>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedCase.model_response}
                  </div>
                </div>
              )}

              <div className="pt-2 text-[10px] font-mono text-slate-500 flex items-center justify-between border-t border-slate-800">
                <span>Prompt Hash: {selectedCase.prompt_hash.slice(0, 20)}...</span>
                <span>Latency: {selectedCase.latency_ms}ms</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveViewPage() {
  return (
    <Suspense fallback={<div className="text-xs font-mono text-slate-500">Loading Live View...</div>}>
      <LiveViewContent />
    </Suspense>
  );
}

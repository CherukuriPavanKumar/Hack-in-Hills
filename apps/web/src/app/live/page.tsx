"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  CheckCircle2, 
  XCircle, 
  Terminal, 
  ArrowRight,
  ShieldCheck,
  Lock,
  Eye,
  FileText
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
    <div className="space-y-6">
      {/* Top Header & Run Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-edge pb-4">
        <div>
          <h1 className="text-xl font-bold text-label-primary tracking-tight">
            Run Execution & Live Telemetry
          </h1>
          <p className="text-xs text-label-secondary mt-1">
            Real-time state transitions, boundary probes, gateway decisions, and test results.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-label-muted">RUN:</span>
          <select
            value={activeRunId || ""}
            onChange={(e) => handleSelectRun(e.target.value)}
            className="bg-surface border border-edge rounded px-2.5 py-1 text-xs font-mono text-label-primary focus:border-signal-blue focus:outline-none"
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
          <div className="bg-surface border border-edge rounded-lg p-3.5 grid grid-cols-2 md:grid-cols-6 gap-3 text-xs font-mono">
            <div>
              <span className="text-label-muted block text-[10px]">RUN IDENTIFIER</span>
              <span className="text-label-primary font-medium truncate block">{run.id}</span>
            </div>
            <div>
              <span className="text-label-muted block text-[10px]">BENCHMARK SUITE</span>
              <span className="text-label-secondary block truncate">{run.suite_id}</span>
            </div>
            <div>
              <span className="text-label-muted block text-[10px]">DEFENSE POLICY</span>
              <span className="text-label-secondary block truncate">{run.policy_id}</span>
            </div>
            <div>
              <span className="text-label-muted block text-[10px]">TARGET MODEL</span>
              <span className="text-label-secondary block truncate">{run.model_id}</span>
            </div>
            <div>
              <span className="text-label-muted block text-[10px]">SESSION MEMORY</span>
              <span className="text-signal-emerald font-medium block">Clean / Isolated</span>
            </div>
            <div>
              <span className="text-label-muted block text-[10px]">CONFIG SHA-256</span>
              <span className="text-label-muted block truncate" title={run.config_hash}>
                {run.config_hash.slice(0, 14)}...
              </span>
            </div>
          </div>

          {/* Stepper */}
          <LifecycleProgress currentStatus={run.status} />

          {/* Topology Map */}
          <TopologyMap initialProbes={run.probes || []} />

          {/* Test Case Execution Grid */}
          <div className="bg-surface border border-edge rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-edge bg-canvas/40 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-label-primary tracking-wide">
                  Test Case Results & Gateway Interceptions
                </h3>
                <p className="text-xs text-label-muted mt-0.5">
                  Deterministic evaluation verdicts based on gateway policy enforcement and model completions
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-signal-emerald/10 text-signal-emerald">
                  Passed: {run.score_summary?.passed ?? 0}
                </span>
                <span className="px-2 py-0.5 rounded bg-signal-rose/10 text-signal-rose">
                  Failed: {run.score_summary?.failed ?? 0}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-edge text-label-muted bg-canvas/20">
                    <th className="py-2.5 px-4 font-normal">Case ID</th>
                    <th className="py-2.5 px-4 font-normal">Category</th>
                    <th className="py-2.5 px-4 font-normal">Gateway Decision</th>
                    <th className="py-2.5 px-4 font-normal">Reason / Rationale</th>
                    <th className="py-2.5 px-4 font-normal">Verdict</th>
                    <th className="py-2.5 px-4 font-normal">Latency</th>
                    <th className="py-2.5 px-4 font-normal text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-subtle">
                  {run.test_cases?.map((tc) => (
                    <tr key={tc.case_id} className="hover:bg-subtle/50 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-label-primary">{tc.case_id}</td>
                      <td className="py-2.5 px-4 text-label-muted">{tc.category}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-1.5 py-0.5 rounded font-medium ${
                          tc.gateway_decision === "ALLOW"
                            ? "bg-signal-emerald/10 text-signal-emerald"
                            : "bg-signal-rose/10 text-signal-rose"
                        }`}>
                          {tc.gateway_decision}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-label-secondary max-w-xs truncate" title={tc.gateway_reason || tc.rationale_code}>
                        {tc.gateway_reason || tc.rationale_code}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`font-semibold ${
                          tc.verdict === "PASS"
                            ? "text-signal-emerald"
                            : tc.verdict === "FAIL"
                            ? "text-signal-rose"
                            : "text-signal-amber"
                        }`}>
                          {tc.verdict}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-label-muted">{tc.latency_ms}ms</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedCase(tc)}
                          className="px-2 py-1 rounded bg-subtle hover:bg-edge text-label-primary transition-colors text-[11px]"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Event Timeline */}
          <div className="bg-surface border border-edge rounded-lg p-5">
            <div className="flex items-center justify-between border-b border-edge pb-3 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-label-primary tracking-wide">
                  Audit Events ({events.length} Recorded)
                </h3>
                <p className="text-xs text-label-muted mt-0.5">
                  Sequential ledger of lifecycle and evaluation events
                </p>
              </div>
              <Link
                href="/integrity"
                className="text-xs font-mono text-signal-blue hover:underline"
              >
                Integrity Center →
              </Link>
            </div>

            <div className="space-y-2 font-mono text-xs max-h-72 overflow-y-auto pr-1">
              {events.map((evt) => (
                <div
                  key={evt.seq}
                  className="p-2.5 rounded bg-canvas border border-edge-subtle flex items-center justify-between text-[11px]"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-label-muted font-bold">#{evt.seq}</span>
                    <span className="text-label-primary font-medium">{evt.event_type}</span>
                    <span className="text-label-muted">({evt.actor})</span>
                  </div>
                  <div className="flex items-center space-x-3 text-label-muted">
                    <span title={evt.event_hash}>{evt.event_hash.slice(0, 12)}...</span>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-edge rounded-lg max-w-xl w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-label-primary">{selectedCase.case_id}</span>
                <span className="text-xs text-label-muted font-mono">({selectedCase.category})</span>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-label-muted hover:text-label-primary text-xs font-mono px-2 py-0.5 rounded bg-subtle"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono text-label-muted uppercase block mb-1">
                  Prompt Payload (Role-Aware Masked)
                </label>
                <div className="p-3 bg-canvas rounded border border-edge text-label-primary font-mono whitespace-pre-wrap text-[11px]">
                  {selectedCase.prompt}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-2.5 bg-canvas rounded border border-edge">
                  <span className="text-label-muted block text-[10px]">GATEWAY</span>
                  <span className={`font-medium ${selectedCase.gateway_decision === "ALLOW" ? "text-signal-emerald" : "text-signal-rose"}`}>
                    {selectedCase.gateway_decision}
                  </span>
                  <p className="text-label-muted text-[10px] mt-0.5">{selectedCase.gateway_reason}</p>
                </div>
                <div className="p-2.5 bg-canvas rounded border border-edge">
                  <span className="text-label-muted block text-[10px]">VERDICT</span>
                  <span className={`font-medium ${selectedCase.verdict === "PASS" ? "text-signal-emerald" : "text-signal-rose"}`}>
                    {selectedCase.verdict}
                  </span>
                  <p className="text-label-muted text-[10px] mt-0.5">{selectedCase.rationale_code}</p>
                </div>
              </div>

              {selectedCase.model_response && (
                <div>
                  <label className="text-[10px] font-mono text-label-muted uppercase block mb-1">
                    Target Model Response
                  </label>
                  <div className="p-3 bg-canvas rounded border border-edge text-label-secondary font-mono whitespace-pre-wrap max-h-36 overflow-y-auto text-[11px]">
                    {selectedCase.model_response}
                  </div>
                </div>
              )}

              <div className="pt-2 text-[10px] font-mono text-label-muted flex items-center justify-between border-t border-edge-subtle">
                <span>Hash: {selectedCase.prompt_hash.slice(0, 16)}...</span>
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
    <Suspense fallback={<div className="text-xs font-mono text-label-muted p-4">Loading Live View...</div>}>
      <LiveViewContent />
    </Suspense>
  );
}

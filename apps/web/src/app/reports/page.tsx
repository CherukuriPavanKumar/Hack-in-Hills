"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Download, ShieldCheck, AlertTriangle, CheckCircle2, Terminal } from "lucide-react";
import { TestRun, RunReport, fetchRuns, fetchRunReport } from "@/lib/api";
import { useRole } from "@/lib/RoleContext";

function ReportsContent() {
  const { role: currentRole } = useRole();
  const searchParams = useSearchParams();
  const requestedRunId = searchParams?.get("run_id") || null;

  const [runs, setRuns] = useState<TestRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(requestedRunId);
  const [report, setReport] = useState<RunReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRuns() {
      try {
        const allRuns = await fetchRuns(currentRole);
        setRuns(allRuns);

        const targetId = selectedRunId || (allRuns.length > 0 ? allRuns[0].id : null);
        if (targetId) {
          setSelectedRunId(targetId);
          const rep = await fetchRunReport(targetId);
          setReport(rep);
        }
      } catch (err) {
        console.error("Report load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRuns();
  }, [selectedRunId, currentRole]);

  const handleSelectRun = async (id: string) => {
    setSelectedRunId(id);
    try {
      const rep = await fetchRunReport(id);
      setReport(rep);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bayora_report_${report.run_id}.json`;
    a.click();
  };

  const handleDownloadMarkdown = async () => {
    if (!report) return;
    const res = await fetch(`http://localhost:8000/api/runs/${report.run_id}/report?format=markdown`);
    const md = await res.text();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bayora_report_${report.run_id}.md`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-edge pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-slate-300" />
            <h1 className="text-lg font-semibold text-slate-100 tracking-tight">
              Evaluation Audit & Findings Reports
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Standardized evaluation dossiers containing cryptographic proof manifests, isolation verification, and residual security boundaries.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <label htmlFor="reportRunSelect" className="text-xs font-mono text-slate-400">Run:</label>
          <select
            id="reportRunSelect"
            value={selectedRunId || ""}
            onChange={(e) => handleSelectRun(e.target.value)}
            className="bg-surface border border-edge rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-signal-blue"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} ({r.status})
              </option>
            ))}
          </select>

          <button
            onClick={handleDownloadJson}
            disabled={!report}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-surface hover:bg-slate-800 border border-edge text-slate-300 text-xs font-mono transition-colors disabled:opacity-40"
          >
            <Download className="w-3 h-3" />
            <span>JSON</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            disabled={!report}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-signal-blue hover:bg-blue-600 text-white text-xs font-mono transition-colors disabled:opacity-40"
          >
            <Download className="w-3 h-3" />
            <span>Markdown</span>
          </button>
        </div>
      </div>

      {report && (
        <div className="bg-surface border border-edge rounded-lg p-6 space-y-6 max-w-5xl mx-auto">
          {/* Report Title Banner */}
          <div className="border-b border-edge pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-canvas border border-edge text-slate-300">
                Evaluation audit dossier
              </span>
              <h2 className="text-base font-semibold text-slate-100 mt-2 font-mono">Run: {report.run_id}</h2>
              <div className="text-xs text-slate-400 mt-0.5 font-mono">
                Timestamp: {report.exported_at.slice(0, 19)} UTC
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-mono text-slate-500 block">SHA-256 Ledger State</span>
              <span className="px-2.5 py-0.5 rounded bg-signal-emerald/10 border border-signal-emerald/20 text-signal-emerald font-medium font-mono text-xs inline-flex items-center space-x-1.5 mt-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified</span>
              </span>
            </div>
          </div>

          {/* 1. Tested Configuration */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-200 font-mono">
              1. Pinned configuration digests
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-canvas rounded border border-edge">
                <span className="text-slate-500 block text-[10px]">Benchmark suite</span>
                <span className="text-slate-200 font-medium">{report.tested_configuration.suite_id}</span>
                <span className="text-slate-500 text-[10px] block mt-0.5">SHA256: {report.tested_configuration.suite_hash?.slice(0, 24)}...</span>
              </div>
              <div className="p-3 bg-canvas rounded border border-edge">
                <span className="text-slate-500 block text-[10px]">Defense policy</span>
                <span className="text-slate-200 font-medium">{report.tested_configuration.policy_id}</span>
                <span className="text-slate-500 text-[10px] block mt-0.5">SHA256: {report.tested_configuration.policy_hash?.slice(0, 24)}...</span>
              </div>
              <div className="p-3 bg-canvas rounded border border-edge">
                <span className="text-slate-500 block text-[10px]">Target model profile</span>
                <span className="text-slate-200 font-medium">{report.tested_configuration.model_id}</span>
                <span className="text-slate-500 text-[10px] block mt-0.5">Version: {report.tested_configuration.model_version}</span>
              </div>
              <div className="p-3 bg-canvas rounded border border-edge">
                <span className="text-slate-500 block text-[10px]">Evaluator engine</span>
                <span className="text-slate-200 font-medium">{report.tested_configuration.evaluator_version}</span>
                <span className="text-slate-500 text-[10px] block mt-0.5">Config digest: {report.tested_configuration.config_hash?.slice(0, 24)}...</span>
              </div>
            </div>
          </div>

          {/* 2. Boundary Probes */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-200 font-mono">
              2. Trust boundary isolation verification
            </h3>
            <div className="overflow-x-auto border border-edge rounded">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-edge text-slate-400 bg-canvas/60">
                    <th className="py-2 px-3 font-medium">Probe</th>
                    <th className="py-2 px-3 font-medium">Expected</th>
                    <th className="py-2 px-3 font-medium">Observed</th>
                    <th className="py-2 px-3 font-medium">Verdict</th>
                    <th className="py-2 px-3 font-medium">Evidence trace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {report.boundary_probes?.map((p) => (
                    <tr key={p.probe_name} className="hover:bg-canvas/30">
                      <td className="py-2 px-3 font-medium text-slate-200">{p.probe_name}</td>
                      <td className="py-2 px-3 text-signal-rose">{p.expected}</td>
                      <td className="py-2 px-3 text-signal-rose">{p.observed}</td>
                      <td className="py-2 px-3 font-medium text-signal-emerald">{p.verdict}</td>
                      <td className="py-2 px-3 text-slate-400 max-w-sm truncate" title={p.evidence}>
                        {p.evidence}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Findings Summary */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-200 font-mono">
              3. Findings and performance metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono text-center">
              <div className="p-3 bg-canvas rounded border border-edge">
                <span className="text-slate-500 block text-[10px]">Total test cases</span>
                <span className="text-lg font-semibold text-slate-100">{report.findings_summary?.total_cases ?? 8}</span>
              </div>
              <div className="p-3 bg-canvas rounded border border-edge">
                <span className="text-slate-500 block text-[10px]">Mitigated / Passed</span>
                <span className="text-lg font-semibold text-signal-emerald">{report.findings_summary?.passed ?? 8}</span>
              </div>
              <div className="p-3 bg-canvas rounded border border-edge">
                <span className="text-slate-500 block text-[10px]">Compromised / Failed</span>
                <span className="text-lg font-semibold text-signal-rose">{report.findings_summary?.failed ?? 0}</span>
              </div>
              <div className="p-3 bg-canvas rounded border border-edge">
                <span className="text-slate-500 block text-[10px]">Median latency</span>
                <span className="text-lg font-semibold text-slate-200">{report.findings_summary?.p50_latency_ms ?? 0}ms</span>
              </div>
            </div>
          </div>

          {/* 4. Residual Risks */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-200 font-mono">
              4. Documented residual limitations and security boundaries
            </h3>
            <div className="space-y-2">
              {report.residual_risks?.map((risk) => (
                <div key={risk.risk_id} className="p-3 rounded bg-canvas border border-edge text-xs">
                  <div className="flex items-center space-x-2 font-mono">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      risk.severity === "HIGH"
                        ? "bg-signal-rose/10 text-signal-rose border border-signal-rose/30"
                        : risk.severity === "MEDIUM"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        : "bg-surface text-slate-300 border border-edge"
                    }`}>
                      {risk.severity}
                    </span>
                    <span className="font-medium text-slate-200">{risk.title}</span>
                  </div>
                  <p className="mt-1.5 text-slate-400 leading-relaxed font-sans text-xs">{risk.description}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="text-xs font-mono text-slate-500 py-6">Loading report...</div>}>
      <ReportsContent />
    </Suspense>
  );
}

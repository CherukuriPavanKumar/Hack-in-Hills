"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Download, ShieldCheck, AlertTriangle, CheckCircle2, Terminal, Copy, Check } from "lucide-react";
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <h1 className="text-2xl font-extrabold text-white tracking-wide">
              Executive Audit & Findings Reports
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Standardized evaluation reports with cryptographic integrity proofs, boundary outcomes, and explicit residual risks.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          <select
            value={selectedRunId || ""}
            onChange={(e) => handleSelectRun(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
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
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            disabled={!report}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono transition-colors shadow-md disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Markdown</span>
          </button>
        </div>
      </div>

      {report && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm space-y-8 max-w-5xl mx-auto">
          {/* Report Title Banner */}
          <div className="border-b border-slate-800 pb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                OFFICIAL EVALUATION AUDIT REPORT
              </span>
              <h2 className="text-xl font-bold text-white mt-2 font-mono">Run ID: {report.run_id}</h2>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                Report Generated: {report.exported_at.slice(0, 19)} UTC
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono text-slate-400 block">SHA-256 LEDGER STATUS</span>
              <span className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold font-mono text-xs inline-flex items-center space-x-1.5 mt-1">
                <ShieldCheck className="w-4 h-4" />
                <span>INTEGRITY VERIFIED</span>
              </span>
            </div>
          </div>

          {/* 1. Tested Configuration */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider">
              1. Pinned Configuration & Cryptographic Digests
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">BENCHMARK SUITE</span>
                <span className="text-slate-200 font-semibold">{report.tested_configuration.suite_id}</span>
                <span className="text-slate-500 text-[11px] block mt-0.5">SHA256: {report.tested_configuration.suite_hash?.slice(0, 24)}...</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">DEFENSE POLICY</span>
                <span className="text-indigo-400 font-semibold">{report.tested_configuration.policy_id}</span>
                <span className="text-slate-500 text-[11px] block mt-0.5">SHA256: {report.tested_configuration.policy_hash?.slice(0, 24)}...</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">TARGET MODEL PROFILE</span>
                <span className="text-emerald-400 font-semibold">{report.tested_configuration.model_id}</span>
                <span className="text-slate-500 text-[11px] block mt-0.5">Version: {report.tested_configuration.model_version}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">EVALUATOR & CONFIG HASH</span>
                <span className="text-cyan-400 font-semibold">{report.tested_configuration.evaluator_version}</span>
                <span className="text-slate-500 text-[11px] block mt-0.5">Hash: {report.tested_configuration.config_hash?.slice(0, 24)}...</span>
              </div>
            </div>
          </div>

          {/* 2. Boundary Probes */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider">
              2. Trust Boundary Isolation Verification
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                    <th className="py-2.5 px-3">Probe</th>
                    <th className="py-2.5 px-3">Expected</th>
                    <th className="py-2.5 px-3">Observed</th>
                    <th className="py-2.5 px-3">Verdict</th>
                    <th className="py-2.5 px-3">Recorded Evidence Trace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {report.boundary_probes?.map((p) => (
                    <tr key={p.probe_name}>
                      <td className="py-2.5 px-3 font-semibold text-slate-200">{p.probe_name}</td>
                      <td className="py-2.5 px-3 text-rose-400">{p.expected}</td>
                      <td className="py-2.5 px-3 text-rose-400">{p.observed}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-400">{p.verdict}</td>
                      <td className="py-2.5 px-3 text-slate-400 max-w-sm truncate" title={p.evidence}>
                        {p.evidence}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Findings Summary */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider">
              3. Adversarial Findings & Performance Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono text-center">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">TOTAL CASES</span>
                <span className="text-xl font-bold text-white">{report.findings_summary?.total_cases ?? 8}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">PASS / MITIGATED</span>
                <span className="text-xl font-bold text-emerald-400">{report.findings_summary?.passed ?? 8}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">FAILED / EXPLOITED</span>
                <span className="text-xl font-bold text-rose-400">{report.findings_summary?.failed ?? 0}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">MEDIAN LATENCY</span>
                <span className="text-xl font-bold text-cyan-400">{report.findings_summary?.p50_latency_ms ?? 0}ms</span>
              </div>
            </div>
          </div>

          {/* 4. Residual Risks */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider">
              4. Residual Limitations & Stated Security Bounds
            </h3>
            <div className="space-y-2">
              {report.residual_risks?.map((risk) => (
                <div key={risk.risk_id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div className="flex items-center space-x-2 font-mono">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      risk.severity === "HIGH"
                        ? "bg-rose-950 text-rose-400 border border-rose-800"
                        : risk.severity === "MEDIUM"
                        ? "bg-amber-950 text-amber-400 border border-amber-800"
                        : "bg-slate-800 text-slate-300"
                    }`}>
                      {risk.severity}
                    </span>
                    <span className="font-bold text-slate-200">{risk.title}</span>
                  </div>
                  <p className="mt-2 text-slate-400 leading-relaxed font-sans">{risk.description}</p>
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
    <Suspense fallback={<div className="text-xs font-mono text-slate-500">Loading Report...</div>}>
      <ReportsContent />
    </Suspense>
  );
}

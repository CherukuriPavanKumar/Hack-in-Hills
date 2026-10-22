"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Database, ShieldCheck, CheckCircle2 } from "lucide-react";
import { TestRun, AuditEvent, fetchRuns, fetchRunEvents } from "@/lib/api";
import { useRole } from "@/lib/RoleContext";
import { HashChainViewer } from "@/components/HashChainViewer";
import { WhatThisProves } from "@/components/WhatThisProves";

function IntegrityContent() {
  const { role: currentRole } = useRole();
  const searchParams = useSearchParams();
  const requestedRunId = searchParams?.get("run_id") || null;

  const [runs, setRuns] = useState<TestRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(requestedRunId);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const allRuns = await fetchRuns(currentRole);
        setRuns(allRuns);

        const targetId = selectedRunId || (allRuns.length > 0 ? allRuns[0].id : null);
        if (targetId) {
          setSelectedRunId(targetId);
          const ev = await fetchRunEvents(targetId);
          setEvents(ev);
        }
      } catch (err) {
        console.error("Integrity Center load error:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [selectedRunId, currentRole]);

  const handleSelectRun = async (id: string) => {
    setSelectedRunId(id);
    try {
      const ev = await fetchRunEvents(id);
      setEvents(ev);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-edge pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-signal-emerald"></span>
            <h1 className="text-lg font-semibold text-slate-100 tracking-tight">
              Cryptographic Audit Chain & Tamper Evidence
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Canonical SHA-256 state ledger linking each evaluation step, policy decision, and telemetry assertion.
          </p>
        </div>

        {/* Run Selector */}
        <div className="flex items-center space-x-2">
          <label htmlFor="targetRunSelect" className="text-xs font-mono text-slate-400">Target run:</label>
          <select
            id="targetRunSelect"
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
        </div>
      </div>

      {/* Hash Chain Viewer & Tamper Drill Component */}
      {selectedRunId && (
        <HashChainViewer runId={selectedRunId} initialEvents={events} />
      )}

      {/* Educational Walkthrough */}
      <div className="bg-surface border border-edge rounded-lg p-5 space-y-4">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-slate-400" />
          <h2 className="text-xs font-semibold text-slate-200 font-mono">
            Cryptographic ledger specifications
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded bg-canvas border border-edge space-y-1.5">
            <div className="text-slate-200 font-medium text-xs">1. Canonical serialization</div>
            <p className="text-slate-400 text-[11px] leading-relaxed font-sans">
              Every audit event is normalized to canonical JSON with deterministically sorted keys, compact separators without whitespace, and the record's own hash key excluded prior to hashing.
            </p>
          </div>

          <div className="p-3.5 rounded bg-canvas border border-edge space-y-1.5">
            <div className="text-slate-200 font-medium text-xs">2. Cryptographic linkage</div>
            <p className="text-slate-400 text-[11px] leading-relaxed font-sans">
              <code className="text-[10px] text-slate-300 font-mono">event_hash = SHA256(prev_hash || ':' || canonical_json)</code>. The genesis block links to 64 consecutive zeros.
            </p>
          </div>

          <div className="p-3.5 rounded bg-canvas border border-edge space-y-1.5">
            <div className="text-slate-200 font-medium text-xs">3. Independent verification</div>
            <p className="text-slate-400 text-[11px] leading-relaxed font-sans">
              The verifier recomputes hashes from Genesis to Head sequentially. Any byte altered in transit or at rest invalidates all subsequent child digests.
            </p>
          </div>
        </div>
      </div>

      <WhatThisProves />
    </div>
  );
}

export default function IntegrityCenterPage() {
  return (
    <Suspense fallback={<div className="text-xs font-mono text-slate-500 py-6">Loading integrity center...</div>}>
      <IntegrityContent />
    </Suspense>
  );
}
